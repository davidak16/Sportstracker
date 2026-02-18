import React, { useState } from "react";
/**
 * Tracking.jsx
 * - Team bets and player props tracked the same way
 * - Player flow uses /api/player_event/:playerId to get eventId
 * - Player props supported: player_tds_over, player_1st_td, player_anytime_td, player_last_td
 */
const Tracking = () => {
  const [playerQuery, setPlayerQuery] = useState("");
  const [teamQuery, setTeamQuery] = useState("");
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [tracked, setTracked] = useState([]);
  const [availableBets, setAvailableBets] = useState([]);
  const [straightBets, setStraightBets] = useState([]);
  // ----------------- formatters -----------------
  const fmtPoint = (p) => (p != null && !isNaN(Number(p)) ? Number(p).toFixed(1) : p);
  const fmtPrice = (p) => (p != null && !isNaN(Number(p)) ? Number(p).toFixed(2) : p ?? "");
  const getRowColor = (type) => {
    switch (type) {
      case "H2H": return "#d1f0d1";
      case "SPREADS": return "#fff4b2";
      case "TOTALS": return "#b3d9ff";
      case "PLAYER": return "#f3d9ff";
      default: return "white";
    }
  };
  // ----------------- searches -----------------
  const handlePlayerSearch = async (e) => {
    e.preventDefault();
    if (!playerQuery.trim()) return;
    try {
      const res = await fetch(`http://localhost:3000/api/search/${encodeURIComponent(playerQuery)}`);
      const data = await res.json();
      setPlayers(data);
      setTeams([]);
      setSelectedPlayer(null);
      setSelectedTeam(null);
      setAvailableBets([]);
      setStraightBets([]);
    } catch (err) {
      console.error("Player search failed", err);
    }
  };
  const handleTeamSearch = async (e) => {
    e.preventDefault();
    if (!teamQuery.trim()) return;
    try {
      const res = await fetch(`http://localhost:3000/api/odds/americanfootball_nfl`);
      const data = await res.json();
      const filteredTeams = (data || []).filter(
        (ev) => ev.home_team.toLowerCase().includes(teamQuery.toLowerCase()) ||
                ev.away_team.toLowerCase().includes(teamQuery.toLowerCase())
      );
      setTeams(filteredTeams);
      setPlayers([]);
      setSelectedPlayer(null);
      setSelectedTeam(null);
      setAvailableBets([]);
      setStraightBets([]);
    } catch (err) {
      console.error("Team search failed", err);
    }
  };
  // ----------------- confirm selection -----------------
  const handleConfirmSelection = async () => {
    let name;
    let trackedTeam;
    if (selectedPlayer) {
      name = `${selectedPlayer.FirstName} ${selectedPlayer.LastName}`;
      trackedTeam = selectedPlayer.Team;
    } else if (selectedTeam) {
      const home = selectedTeam.home_team;
      const away = selectedTeam.away_team;
      // Detect which team matches the query
      name = home.toLowerCase().includes(teamQuery.toLowerCase()) ? home : away;
      trackedTeam = name; // Track the matched team
    }
    if (!name) return;
    // add to tracked
    if (!tracked.find((t) => t.name === name)) {
      setTracked((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: selectedPlayer ? "Player" : "Team",
          name,
          team: trackedTeam,
          status: "Active",
        },
      ]);
    }
    // ----------------- TEAM FLOW -----------------
    if (selectedTeam) {
      const event = selectedTeam;
      const markets = event.bookmakers?.[0]?.markets || [];
      const marketsToAdd = markets
        .filter((m) => ["h2h", "spreads", "totals"].includes(m.key))
        .map((market) => ({
          id: `${event.id}-${market.key}`,
          event: market.key,
          home: event.home_team,
          away: event.away_team,
          matchData: event,
          marketKey: market.key,
          label: `${market.key.toUpperCase()} — ${event.home_team} vs ${event.away_team}`,
        }));
      setAvailableBets((prev) => [...prev, ...marketsToAdd]);
    }
    // ----------------- PLAYER FLOW -----------------
    if (selectedPlayer) {
      try {
        // 1. Get event ID for player
        const res = await fetch(`http://localhost:3000/api/player_event/${selectedPlayer.PlayerID}`);
        const { eventId } = await res.json();
        if (!eventId) throw new Error("No eventId found for player");
        // 2. Fetch full event odds
        const oddsRes = await fetch(`http://localhost:3000/api/odds/nfl/${eventId}`);
        const eventData = await oddsRes.json();
        const eventObj = Array.isArray(eventData) ? eventData[0] : eventData;
        const bookmakers = eventObj.bookmakers || [];
        const playerMarketKeys = [
          "player_tds_over",
          "player_1st_td",
          "player_anytime_td",
          "player_last_td"
        ];
        const playerMarkets = [];
        bookmakers.forEach((book) => {
          (book.markets || []).forEach((market) => {
            if (playerMarketKeys.includes(market.key)) {
              (market.outcomes || []).forEach((o) => {
                const nameMatch = (o.name || "").toLowerCase().includes(playerFull);
                const descMatch = (o.description || "").toLowerCase().includes(playerFull);
                if (nameMatch || descMatch) {
                  playerMarkets.push({
                    id: `${eventObj.id}-${market.key}-${book.key}-${o.name || 'yes'}`,
                    event: market.key,
                    matchData: eventObj,
                    marketKey: market.key,
                    playerName: playerFull,
                    label: `${market.key.toUpperCase()} — ${playerFull} (${eventObj.home_team} vs ${eventObj.away_team})`,
                    outcome: o, // Store for later
                  });
                }
              });
            }
          });
        });
        setAvailableBets((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...playerMarkets.filter((p) => !ids.has(p.id))];
        });
      } catch (err) {
        console.error("Player-market fetch failed", err);
      }
    }
    // clear selection
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setPlayers([]);
    setTeams([]);
    setPlayerQuery("");
    setTeamQuery("");
  };
  // ----------------- handle selecting a bet -----------------
  const handleSelectBet = (bet) => {
    const match = bet.matchData;
    if (!match) return;
    const marketKey = bet.marketKey;
    const allBookmakers = match.bookmakers || [];
    const isPlayerMarket = marketKey && marketKey.startsWith("player");
    if (isPlayerMarket) {
      const playerName = bet.playerName;
      const isOverUnder = ['player_tds_over'].includes(marketKey); // Add more if needed
      allBookmakers.forEach((book) => {
        const bookMarket = (book.markets || []).find((m) => m.key === marketKey);
        if (!bookMarket) return;
        const rows = [];
        (bookMarket.outcomes || []).forEach((o) => {
          const playerFull = playerName.toLowerCase();
          const nameMatch = (o.name || "").toLowerCase().includes(playerFull);
          const descMatch = (o.description || "").toLowerCase().includes(playerFull);
          if (nameMatch || descMatch) {
            const point = o.point != null ? fmtPoint(o.point) : "";
            const price = fmtPrice(o.price);
            const outcomeName = o.name || (descMatch ? o.description.split(' ')[2] : 'Yes'); // e.g., "Over" from desc
            const playerRow = { 
              type: marketKey.toUpperCase(), 
              team: `${playerName} - ${outcomeName}`,
              market: marketKey 
            };
            playerRow[book.title] = point ? `${point} (${price})` : price;
            rows.push(playerRow);
          }
        });
        if (!isOverUnder) {
          // For single-outcome, merge into one row if needed
          const singleRow = rows.reduce((acc, r) => ({ ...acc, ...r }), {});
          setStraightBets((prev) => [...prev, singleRow]);
        } else {
          setStraightBets((prev) => [...prev, ...rows]);
        }
      });
      return;
    }
    // TEAM MARKET (H2H/SPREADS/TOTALS)
    const matchup = `${match.home_team} vs ${match.away_team}`;
    let homeRow = { team: match.home_team, market: marketKey };
    let awayRow = { team: match.away_team, market: marketKey };
    if (marketKey === "totals") {
      homeRow.team = `${matchup} - Over`;
      awayRow.team = `${matchup} - Under`;
    }
    allBookmakers.forEach((book) => {
      const bookMarket = (book.markets || []).find((m) => m.key === marketKey);
      if (!bookMarket) return;
      (bookMarket.outcomes || []).forEach((o) => {
        const point = o.point != null ? fmtPoint(o.point) : "";
        const price = fmtPrice(o.price);
        const display = point ? `${point} (${price})` : price;
        if (marketKey === "spreads" || marketKey === "h2h") {
          if (o.name === match.home_team) homeRow[book.title] = display;
          if (o.name === match.away_team) awayRow[book.title] = display;
        } else if (marketKey === "totals") {
          if (o.name.toLowerCase() === "over") homeRow[book.title] = display;
          if (o.name.toLowerCase() === "under") awayRow[book.title] = display;
        }
      });
    });
    homeRow.type = marketKey.toUpperCase();
    awayRow.type = marketKey.toUpperCase();
    setStraightBets((prev) => [...prev, homeRow, awayRow]);
  };
  // ----------------- delete tracked -----------------
  const handleDeleteTracked = (item) => {
    setTracked((prev) => prev.filter((t) => t.id !== item.id));
    setAvailableBets((prev) =>
      prev.filter((b) => {
        if (item.type === "Team") return !(b.home?.includes(item.name) || b.away?.includes(item.name));
        if (item.type === "Player") return b.playerName !== item.name;
        return true;
      })
    );
    setStraightBets((prev) => prev.filter((b) => !b.team.includes(item.name)));
  };
  // ----------------- create parlay -----------------
  const handleCreateParlay = () => {
    if (tracked.length < 2) return alert("Select at least 2 tracked items for a parlay.");
    const parlay = tracked.map((t) => t.name).join(" + ");
    alert(`Parlay created: ${parlay}`);
  };
  // ----------------- get unique books for headers -----------------
  const getUniqueBooks = () => {
    const books = new Set();
    straightBets.forEach((b) => {
      Object.keys(b).forEach((key) => {
        if (!["team", "market", "type"].includes(key)) books.add(key);
      });
    });
    return Array.from(books);
  };
  // ----------------- UI -----------------
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📊 NFL Bet Tracker</h1>
      {/* Search */}
      <div style={{ display: "flex", gap: "2rem", marginTop: "1rem" }}>
        <form onSubmit={handlePlayerSearch}>
          <input type="text" placeholder="Search Player" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} />
          <button type="submit">Search</button>
        </form>
        <form onSubmit={handleTeamSearch}>
          <input type="text" placeholder="Search Team" value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} />
          <button type="submit">Search</button>
        </form>
      </div>
      {/* Results */}
      {(players.length > 0 || teams.length > 0) && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Results</h2>
          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Team/Matchup</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.PlayerID}>
                  <td>Player</td>
                  <td>{`${p.FirstName} ${p.LastName}`}</td>
                  <td>{p.Team}</td>
                  <td>{p.Status || "Active"}</td>
                  <td><button onClick={() => setSelectedPlayer(p)}>Select</button></td>
                </tr>
              ))}
              {teams.map((t) => (
                <tr key={t.id}>
                  <td>Team</td>
                  <td>{t.home_team} vs {t.away_team}</td>
                  <td>{t.home_team} / {t.away_team}</td>
                  <td>Active</td>
                  <td><button onClick={() => setSelectedTeam(t)}>Select</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Confirm */}
      {(selectedPlayer || selectedTeam) && (
        <div style={{ marginTop: "1rem" }}>
          <h4>
            Selected: {selectedPlayer ? `${selectedPlayer.FirstName} ${selectedPlayer.LastName}` : `${selectedTeam.home_team} vs ${selectedTeam.away_team}`}
          </h4>
          <button onClick={handleConfirmSelection}>Confirm Selection</button>
        </div>
      )}
      {/* Tracked */}
      <div style={{ marginTop: "2rem" }}>
        <h2>Tracked Items</h2>
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Team</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tracked.map((t) => (
              <tr key={t.id}>
                <td>{t.type}</td>
                <td>{t.name}</td>
                <td>{t.team}</td>
                <td>{t.status}</td>
                <td><button onClick={() => handleDeleteTracked(t)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={handleCreateParlay} style={{ marginTop: "1rem" }}>Create Parlay</button>
      </div>
      {/* Available Bets */}
      {availableBets.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Available Bets</h2>
          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Market</th>
                <th>Home</th>
                <th>Away</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {availableBets.map((b) => (
                <tr key={b.id}>
                  <td>{b.label || b.event.toUpperCase()}</td>
                  <td>{b.home || ""}</td>
                  <td>{b.away || ""}</td>
                  <td><button onClick={() => handleSelectBet(b)}>Select Bet</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Straight Bets */}
      {straightBets.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Straight Bets</h2>
          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Team / Matchup / Player</th>
                <th>Market</th>
                {getUniqueBooks().map((key) => <th key={key}>{key}</th>)}
              </tr>
            </thead>
            <tbody>
              {straightBets.map((b, idx) => (
                <tr key={`${b.team}-${idx}`} style={{ backgroundColor: getRowColor(b.type) }}>
                  <td>{b.team}</td>
                  <td>{b.type}</td>
                  {getUniqueBooks().map((key) => <td key={key}>{b[key] || ""}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Tracking;