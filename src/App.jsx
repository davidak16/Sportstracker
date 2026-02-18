import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase.js';
import {
  onAuthStateChanged
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  getDoc, 
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import SignIn from './SignIn.jsx';
import Premium from './Premium.jsx';
import SuccessPage from './SuccessPage.jsx';
import CancelPage from './CancelPage.jsx';
import Tracking from './Tracking.jsx';
import BetSync from './BetSync.jsx';
import {
  Box,
  Typography,
  TextField,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Collapse,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LaunchIcon from '@mui/icons-material/Launch';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const REFERRAL_BASE = "https://sportsbook.draftkings.com/r/web/";

// Labels for player markets (keys match The Odds API)
const MARKET_LABELS = {
  'player_pass_tds': 'Pass TDs',
  'player_pass_yds': 'Pass Yards',
  'player_pass_completions': 'Completions',
  'player_pass_attempts': 'Pass Attempts',
  'player_pass_interceptions': 'Interceptions',
  'player_rush_yds': 'Rush Yards',
  'player_rush_attempts': 'Rush Attempts',
  'player_receptions': 'Receptions',
  'player_reception_yds': 'Receiving Yards',
  'player_anytime_td': 'Anytime TD',
  'player_kicking_points': 'Kicking Points',
  'player_field_goals': 'Field Goals',
};

// --- TEAM MATCHING ---
const TEAM_KEY_TO_NAME = {
  'ARI': 'Arizona Cardinals',
  'ATL': 'Atlanta Falcons',
  'BAL': 'Baltimore Ravens',
  'BUF': 'Buffalo Bills',
  'CAR': 'Carolina Panthers',
  'CHI': 'Chicago Bears',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'DAL': 'Dallas Cowboys',
  'DEN': 'Denver Broncos',
  'DET': 'Detroit Lions',
  'GB': 'Green Bay Packers',
  'HOU': 'Houston Texans',
  'IND': 'Indianapolis Colts',
  'JAX': 'Jacksonville Jaguars',
  'KC': 'Kansas City Chiefs',
  'LV': 'Las Vegas Raiders',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'MIA': 'Miami Dolphins',
  'MIN': 'Minnesota Vikings',
  'NE': 'New England Patriots',
  'NO': 'New Orleans Saints',
  'NYG': 'New York Giants',
  'NYJ': 'New York Jets',
  'PHI': 'Philadelphia Eagles',
  'PIT': 'Pittsburgh Steelers',
  'SF': 'San Francisco 49ers',
  'SEA': 'Seattle Seahawks',
  'TB': 'Tampa Bay Buccaneers',
  'TEN': 'Tennessee Titans',
  'WAS': 'Washington Commanders',
};

// Extract city and mascot for smarter matching
const getTeamParts = (fullName) => {
  const parts = fullName.split(' ');
  const mascot = parts[parts.length - 1].toLowerCase();
  const city = parts.slice(0, -1).join(' ').toLowerCase();
  return { city, mascot, full: fullName.toLowerCase() };
};

// Smarter team matching
const findMatchingEvent = (bet, allOdds) => {
  // Safety check - allOdds must be an array
  if (!allOdds || !Array.isArray(allOdds) || allOdds.length === 0) return null;
  
  const searchTerms = [];
  
  if (bet.teamKey) {
    searchTerms.push(bet.teamKey.toLowerCase());
    const fullName = TEAM_KEY_TO_NAME[bet.teamKey];
    if (fullName) {
      const parts = getTeamParts(fullName);
      searchTerms.push(parts.full, parts.city, parts.mascot);
    }
  }
  
  if (bet.teamFullName) {
    const parts = getTeamParts(bet.teamFullName);
    searchTerms.push(parts.full, parts.city, parts.mascot);
  }
  
  if (bet.event) {
    searchTerms.push(bet.event.toLowerCase());
  }
  
  return allOdds.find(event => {
    const homeParts = getTeamParts(event.home_team);
    const awayParts = getTeamParts(event.away_team);
    
    return searchTerms.some(term => 
      homeParts.full.includes(term) || 
      homeParts.city.includes(term) || 
      homeParts.mascot.includes(term) ||
      awayParts.full.includes(term) || 
      awayParts.city.includes(term) || 
      awayParts.mascot.includes(term) ||
      term.includes(homeParts.mascot) ||
      term.includes(awayParts.mascot)
    );
  });
};

// --- MOCK DATA with location and kickoff time ---
const mockGames = [
  { id: 1, awayTeam: 'Baltimore Ravens', homeTeam: 'Kansas City Chiefs', awayScore: 20, homeScore: 27, status: 'Final', location: 'Arrowhead Stadium', kickoff: '1/25/2026, 6:40 PM' },
  { id: 2, awayTeam: 'Green Bay Packers', homeTeam: 'Philadelphia Eagles', awayScore: 29, homeScore: 34, status: 'Final', location: 'Lincoln Financial Field', kickoff: '1/25/2026, 4:25 PM' },
  { id: 3, awayTeam: 'Pittsburgh Steelers', homeTeam: 'Atlanta Falcons', awayScore: 18, homeScore: 10, status: 'Final', location: 'Mercedes-Benz Stadium', kickoff: '1/25/2026, 1:00 PM' },
  { id: 4, awayTeam: 'Arizona Cardinals', homeTeam: 'Buffalo Bills', awayScore: 28, homeScore: 34, status: 'Final', location: 'Highmark Stadium', kickoff: '1/25/2026, 1:00 PM' },
  { id: 5, awayTeam: 'Los Angeles Rams', homeTeam: 'Seattle Seahawks', awayScore: null, homeScore: null, status: 'Upcoming', location: 'Lumen Field', kickoff: '1/25/2026, 8:20 PM' },
];

// --- HELPER COMPONENTS ---

// Free Bet Usage Banner
const FreeBetBanner = ({ usedBets, maxBets, isPremium, onUpgrade }) => {
  if (isPremium) return null;
  if (usedBets < 3) return null;
  
  return (
    <Alert 
      severity={usedBets >= maxBets ? "warning" : "info"}
      sx={{ mt: 2, maxWidth: 600, mx: 'auto' }}
    >
      You're using <strong>{usedBets}</strong> of <strong>{maxBets}</strong> free bets.
      {usedBets >= maxBets && (
        <Button size="small" onClick={onUpgrade} sx={{ ml: 1 }}>
          Upgrade to Premium
        </Button>
      )}
    </Alert>
  );
};

// Custom Carousel with location and kickoff
const CustomCarousel = ({ items }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % Math.ceil(items.length / 3));
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  const chunkedItems = [];
  for (let i = 0; i < items.length; i += 3) {
    chunkedItems.push(items.slice(i, i + 3));
  }

  const currentChunk = chunkedItems[index] || [];

  const formatMatchup = (game) => {
    const awayShort = game.awayTeam.split(' ').pop();
    const homeShort = game.homeTeam.split(' ').pop();
    return `${awayShort} @ ${homeShort}`;
  };

  return (
    <Box sx={{ mb: 4, bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {currentChunk.map((game) => (
          <Paper key={game.id} elevation={2} sx={{ flex: 1, p: 2, minWidth: 180, textAlign: 'center' }}>
            <Typography variant="caption" display="block" color="textSecondary">{game.status}</Typography>
            <Typography variant="subtitle2" fontWeight="bold">{formatMatchup(game)}</Typography>
            <Typography variant="caption" display="block" color="textSecondary">{game.kickoff}</Typography>
            {game.awayScore !== null ? (
              <Typography variant="h6" color="primary">{game.awayScore} - {game.homeScore}</Typography>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>{game.location}</Typography>
            )}
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, gap: 1 }}>
        {chunkedItems.map((_, i) => (
          <Box 
            key={i} 
            sx={{ 
              width: 8, height: 8, borderRadius: '50%', 
              bgcolor: i === index ? 'primary.main' : '#ccc' 
            }} 
          />
        ))}
      </Box>
    </Box>
  );
};

// SearchDropdown
const SearchDropdown = ({ query, results, isSearching, onSelect, placeholder, onSearchChange }) => {
  return (
    <Box sx={{ position: 'relative', width: '100%', mb: 3 }}>
      <TextField
        value={query}
        onChange={onSearchChange}
        placeholder={placeholder}
        size="small"
        fullWidth
        autoComplete="off"
        InputProps={{
          endAdornment: isSearching && <CircularProgress size={20} color="inherit" />
        }}
      />
      
      {results.length > 0 && query.length >= 2 && (
        <Paper 
          elevation={5} 
          sx={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0, 
            maxHeight: 250, 
            overflowY: 'auto',
            zIndex: 1500,
            mt: 0.5,
            border: '1px solid #e0e0e0',
            bgcolor: 'background.paper'
          }}
        >
          <List dense disablePadding>
            {results.slice(0, 50).map((item, index) => {
              const label = item.FirstName 
                ? `${item.FirstName} ${item.LastName} (${item.Team})` 
                : `${item.FullName} (${item.Conference})`;
              
              return (
                <React.Fragment key={item.PlayerID || item.TeamID || index}>
                  <ListItem 
                    onClick={() => onSelect(item)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                  >
                    <ListItemText primary={label} />
                    <Button size="small" variant="outlined" sx={{ ml: 1 }}>Track</Button>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
};

// Parlay Builder Component
const ParlayBuilder = ({ legs, onRemoveLeg, onSaveParlay, onCancel }) => {
  // Calculate combined odds
  const calculateParlayOdds = () => {
    if (legs.length === 0) return '+100';
    
    // Convert American odds to decimal, multiply, convert back
    const decimalOdds = legs.map(leg => {
      const oddsStr = String(leg.odds).replace(/[^0-9+-]/g, '');
      const odds = parseFloat(oddsStr);
      if (isNaN(odds) || oddsStr === 'Pending') return 1;
      return odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    });
    
    const combinedDecimal = decimalOdds.reduce((acc, curr) => acc * curr, 1);
    const americanOdds = combinedDecimal >= 2 
      ? Math.round((combinedDecimal - 1) * 100)
      : Math.round(-100 / (combinedDecimal - 1));
    
    return americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`;
  };

  const parlayOdds = calculateParlayOdds();
  const hasPendingOdds = legs.some(leg => leg.odds === 'Pending');

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3, bgcolor: '#f0f7ff', border: '2px solid #1976d2' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>
          🎯 Parlay Builder ({legs.length} legs)
        </Typography>
        <Button variant="outlined" size="small" onClick={onCancel}>
          Cancel
        </Button>
      </Box>

      {legs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Search and add players or teams to build your parlay
        </Typography>
      ) : (
        <>
          <List sx={{ mb: 2 }}>
            {legs.map((leg, index) => (
              <ListItem
                key={index}
                sx={{ bgcolor: 'white', mb: 1, borderRadius: 1 }}
                secondaryAction={
                  <IconButton edge="end" onClick={() => onRemoveLeg(index)}>
                    <CloseIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={leg.event}
                  secondary={`${leg.odds} • ${leg.sportsbook}`}
                />
              </ListItem>
            ))}
          </List>

          <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2">Combined Parlay Odds:</Typography>
            {hasPendingOdds ? (
              <Typography variant="body2" color="text.secondary">
                Click on odds below to set them first
              </Typography>
            ) : (
              <Typography variant="h4" color="primary">{parlayOdds}</Typography>
            )}
          </Box>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => onSaveParlay(parlayOdds)}
            disabled={legs.length < 2 || hasPendingOdds}
          >
            {hasPendingOdds ? 'Set odds for all legs first' : `Save Parlay (${legs.length} legs)`}
          </Button>
        </>
      )}
    </Paper>
  );
};

// Expandable Bet Row with Odds, Totals, and BET button
const BetRow = ({ bet, removeBet, updateBetOdds, allOdds }) => {
  const [open, setOpen] = useState(false);
  const [playerOdds, setPlayerOdds] = useState(null);
  const [loading, setLoading] = useState(false);

  const matchedEvent = findMatchingEvent(bet, allOdds);

  // Fetch event odds when row is expanded (only for non-parlay bets)
  useEffect(() => {
    if (open && matchedEvent?.id && !playerOdds && bet.type !== 'parlay') {
      setLoading(true);
      console.log('Fetching odds for event:', matchedEvent.id);
      fetch(`${API_URL}/api/odds/americanfootball_nfl/${matchedEvent.id}`)
        .then(res => res.json())
        .then(data => {
          console.log('Received odds data:', data);
          setPlayerOdds(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching odds:', err);
          setLoading(false);
        });
    }
  }, [open, matchedEvent?.id, playerOdds, bet.type]);

  const formatOdds = (value) => {
    if (value === undefined || value === null) return '-';
    return value > 0 ? `+${value}` : value;
  };

  // FIXED: Filter player props by description field (where player name is)
  const getPlayerProps = () => {
    if (!playerOdds?.bookmakers) return [];
    
    const playerName = bet.event.toLowerCase();
    const results = [];
    
    playerOdds.bookmakers.forEach(book => {
      book.markets?.forEach(market => {
        // Only process player prop markets
        if (!market.key.startsWith('player_')) return;
        
        market.outcomes.forEach(outcome => {
          // IMPORTANT: Player name is in "description" field, not "name"
          // "name" contains "Over" or "Under"
          const outcomePlayer = (outcome.description || '').toLowerCase();
          
          // Check if this outcome is for our player
          if (outcomePlayer.includes(playerName) || playerName.includes(outcomePlayer)) {
            results.push({
              bookmaker: book.title,
              bookKey: book.key,
              market: market.key,
              marketLabel: MARKET_LABELS[market.key] || market.key,
              name: outcome.name, // "Over" or "Under"
              player: outcome.description,
              price: outcome.price,
              point: outcome.point
            });
          }
        });
      });
    });
    
    console.log('Found player props:', results);
    return results;
  };

  // PARLAY DISPLAY
  if (bet.type === 'parlay') {
    return (
      <>
        <TableRow sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: '#f0f7ff' }}>
          <TableCell>
            <IconButton size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                🎯 {bet.event}
              </Typography>
            </Box>
          </TableCell>
          <TableCell>
            <Chip 
              label={bet.odds} 
              color="primary"
              variant="outlined" 
              size="small" 
            />
          </TableCell>
          <TableCell>{bet.sportsbook}</TableCell>
          <TableCell align="center">
            <IconButton 
              size="small" 
              onClick={() => removeBet(bet.id)}
              sx={{ color: 'error.main' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Parlay Legs:
                </Typography>
                <List dense>
                  {bet.legs?.map((leg, index) => (
                    <ListItem key={index} sx={{ bgcolor: '#fafafa', mb: 1, borderRadius: 1 }}>
                      <ListItemText
                        primary={`${index + 1}. ${leg.event}`}
                        secondary={`${leg.odds} • ${leg.sportsbook}`}
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Combined odds: {bet.odds}
                </Typography>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  }

  // SINGLE BET DISPLAY (original code)
  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{bet.event}</TableCell>
        <TableCell>
          <Chip 
            label={bet.odds} 
            color={bet.odds !== 'Pending' ? 'success' : 'default'} 
            variant="outlined" 
            size="small" 
          />
        </TableCell>
        <TableCell>{bet.sportsbook}</TableCell>
        <TableCell align="center">
          <IconButton 
            size="small" 
            onClick={() => removeBet(bet.id)}
            sx={{ color: 'error.main' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              {!matchedEvent ? (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    No upcoming game found for this selection
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Team: {bet.teamFullName || bet.teamKey || 'Unknown'}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {matchedEvent.away_team} @ {matchedEvent.home_team}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {new Date(matchedEvent.commence_time).toLocaleString()}
                  </Typography>
                  
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : bet.type === 'player' ? (
                    // PLAYER PROPS VIEW
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, maxHeight: 350, overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell><strong>Market</strong></TableCell>
                            <TableCell><strong>Sportsbook</strong></TableCell>
                            <TableCell align="center"><strong>Line</strong></TableCell>
                            <TableCell align="center"><strong>Over</strong></TableCell>
                            <TableCell align="center"><strong>Under</strong></TableCell>
                            <TableCell align="center"><strong>Action</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const props = getPlayerProps();
                            if (props.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      No player props available for {bet.event}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            
                            // Group by market and bookmaker
                            const grouped = {};
                            props.forEach(prop => {
                              const key = `${prop.market}-${prop.bookKey}`;
                              if (!grouped[key]) {
                                grouped[key] = {
                                  market: prop.market,
                                  marketLabel: prop.marketLabel,
                                  bookmaker: prop.bookmaker,
                                  bookKey: prop.bookKey,
                                  point: prop.point,
                                  over: null,
                                  under: null
                                };
                              }
                              if (prop.name === 'Over') {
                                grouped[key].over = prop.price;
                              } else if (prop.name === 'Under') {
                                grouped[key].under = prop.price;
                              }
                            });
                            
                            return Object.values(grouped).map((row, idx) => (
                              <TableRow key={idx} hover>
                                <TableCell>{row.marketLabel}</TableCell>
                                <TableCell>{row.bookmaker}</TableCell>
                                <TableCell align="center">{row.point ?? '-'}</TableCell>
                                <TableCell 
                                  align="center"
                                  onClick={() => row.over && updateBetOdds(bet.id, `O${row.point} (${formatOdds(row.over)})`, row.bookmaker)}
                                  sx={{ cursor: row.over ? 'pointer' : 'default', fontWeight: 'bold', '&:hover': row.over ? { bgcolor: '#e3f2fd' } : {} }}
                                >
                                  {formatOdds(row.over)}
                                </TableCell>
                                <TableCell 
                                  align="center"
                                  onClick={() => row.under && updateBetOdds(bet.id, `U${row.point} (${formatOdds(row.under)})`, row.bookmaker)}
                                  sx={{ cursor: row.under ? 'pointer' : 'default', fontWeight: 'bold', '&:hover': row.under ? { bgcolor: '#e3f2fd' } : {} }}
                                >
                                  {formatOdds(row.under)}
                                </TableCell>
                                <TableCell align="center">
                                  <Button 
                                    variant="contained" 
                                    size="small" 
                                    href={`${REFERRAL_BASE}?event=${matchedEvent.id}`} 
                                    target="_blank" 
                                    sx={{ bgcolor: '#FFD700', color: '#000', fontSize: '0.7rem', '&:hover': { bgcolor: '#FFC107' } }}
                                  >
                                    BET
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    // TEAM BETS VIEW
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, maxHeight: 350, overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell><strong>Sportsbook</strong></TableCell>
                            <TableCell align="center"><strong>{matchedEvent.away_team} ML</strong></TableCell>
                            <TableCell align="center"><strong>{matchedEvent.home_team} ML</strong></TableCell>
                            <TableCell align="center"><strong>Spread</strong></TableCell>
                            <TableCell align="center"><strong>Over</strong></TableCell>
                            <TableCell align="center"><strong>Under</strong></TableCell>
                            <TableCell align="center"><strong>Action</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {matchedEvent.bookmakers?.map((book) => {
                            const h2h = book.markets.find(m => m.key === 'h2h');
                            const spreads = book.markets.find(m => m.key === 'spreads');
                            const totals = book.markets.find(m => m.key === 'totals');
                            
                            const awayML = h2h?.outcomes.find(o => o.name === matchedEvent.away_team)?.price;
                            const homeML = h2h?.outcomes.find(o => o.name === matchedEvent.home_team)?.price;
                            const awaySpread = spreads?.outcomes.find(o => o.name === matchedEvent.away_team);
                            const overOutcome = totals?.outcomes.find(o => o.name === 'Over');
                            const underOutcome = totals?.outcomes.find(o => o.name === 'Under');
                            
                            return (
                              <TableRow key={book.key} hover>
                                <TableCell>{book.title}</TableCell>
                                <TableCell 
                                  align="center" 
                                  onClick={() => updateBetOdds(bet.id, formatOdds(awayML), book.title)}
                                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#e3f2fd' } }}
                                >
                                  {formatOdds(awayML)}
                                </TableCell>
                                <TableCell 
                                  align="center"
                                  onClick={() => updateBetOdds(bet.id, formatOdds(homeML), book.title)}
                                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#e3f2fd' } }}
                                >
                                  {formatOdds(homeML)}
                                </TableCell>
                                <TableCell 
                                  align="center"
                                  onClick={() => updateBetOdds(bet.id, `${awaySpread?.point > 0 ? '+' : ''}${awaySpread?.point}`, book.title)}
                                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#e3f2fd' } }}
                                >
                                  {awaySpread ? `${awaySpread.point > 0 ? '+' : ''}${awaySpread.point} (${formatOdds(awaySpread.price)})` : '-'}
                                </TableCell>
                                <TableCell 
                                  align="center"
                                  onClick={() => updateBetOdds(bet.id, `O${overOutcome?.point} (${formatOdds(overOutcome?.price)})`, book.title)}
                                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#e3f2fd' } }}
                                >
                                  {overOutcome ? `${overOutcome.point} (${formatOdds(overOutcome.price)})` : '-'}
                                </TableCell>
                                <TableCell 
                                  align="center"
                                  onClick={() => updateBetOdds(bet.id, `U${underOutcome?.point} (${formatOdds(underOutcome?.price)})`, book.title)}
                                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#e3f2fd' } }}
                                >
                                  {underOutcome ? `${underOutcome.point} (${formatOdds(underOutcome.price)})` : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  <Button 
                                    variant="contained" 
                                    size="small" 
                                    href={`${REFERRAL_BASE}?event=${matchedEvent.id}`} 
                                    target="_blank" 
                                    sx={{ bgcolor: '#FFD700', color: '#000', fontSize: '0.7rem', '&:hover': { bgcolor: '#FFC107' } }}
                                  >
                                    BET
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          }) || (
                            <TableRow>
                              <TableCell colSpan={7} align="center">No odds available</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// --- MAIN DASHBOARD ---

const MainDashboard = ({ 
  user, 
  bets, 
  isPremium, 
  analytics, 
  playerResults, 
  teamResults, 
  addBet,
  removeBet,
  updateBetOdds,
  onPlayerSearch, 
  onTeamSearch,
  connectSportsbook,
  consent,
  setConsent,
  allOdds,
  parlayMode,
  setParlayMode,
  parlayLegs,
  setParlayLegs,
  saveParlayHandler
}) => {
  const navigate = useNavigate();
  const [playerQuery, setPlayerQuery] = useState('');
  const [teamQuery, setTeamQuery] = useState('');
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false);
  const [isSearchingTeams, setIsSearchingTeams] = useState(false);
  
  const playerTimerRef = useRef(null);
  const teamTimerRef = useRef(null);

  const FREE_BET_LIMIT = 5;

  const handlePlayerChange = (e) => {
    const value = e.target.value;
    setPlayerQuery(value);
    
    if (playerTimerRef.current) clearTimeout(playerTimerRef.current);
    if (value.trim().length >= 2) {
      playerTimerRef.current = setTimeout(() => {
        setIsSearchingPlayers(true);
        onPlayerSearch(value).finally(() => setIsSearchingPlayers(false));
      }, 400);
    }
  };

  const handleTeamChange = (e) => {
    const value = e.target.value;
    setTeamQuery(value);
    
    if (teamTimerRef.current) clearTimeout(teamTimerRef.current);
    if (value.trim().length >= 2) {
      teamTimerRef.current = setTimeout(() => {
        setIsSearchingTeams(true);
        onTeamSearch(value).finally(() => setIsSearchingTeams(false));
      }, 400);
    }
  };

  return (
    <Box sx={{ width: '100vw', minWidth: '100vw', overflowX: 'hidden', textAlign: 'center', p: 2 }}>
      <CustomCarousel items={mockGames} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" sx={{ color: '#000000', fontWeight: 600 }}>
          Bet Tracker Pro
        </Typography>
        {isPremium && (
          <Chip label="PREMIUM MEMBER" color="primary" size="small" />
        )}
      </Box>

      <Typography variant="subtitle1" sx={{ color: '#000000', mb: 2 }}>
        Track players, teams & odds automatically.
      </Typography>
      <Button variant="contained" onClick={connectSportsbook} sx={{ mt: 2 }}>
        Connect DraftKings
      </Button>

      <FreeBetBanner 
        usedBets={bets.length} 
        maxBets={FREE_BET_LIMIT} 
        isPremium={isPremium} 
        onUpgrade={() => navigate('/premium')}
      />

      <Box sx={{ mt: 4, width: '100%', maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>
          Search Players
        </Typography>
        <SearchDropdown 
          query={playerQuery}
          results={playerResults}
          isSearching={isSearchingPlayers}
          onSearchChange={handlePlayerChange}
          onSelect={(item) => {
             if (parlayMode) {
               // Add to parlay instead of saving immediately
               setParlayLegs(prev => [...prev, {
                 event: `${item.FirstName} ${item.LastName}`,
                 teamKey: item.Team,
                 teamFullName: TEAM_KEY_TO_NAME[item.Team],
                 type: 'player',
                 odds: 'Pending',
                 sportsbook: 'DraftKings'
               }]);
             } else {
               addBet(item, 'player');
             }
             setPlayerQuery('');
          }}
          placeholder="e.g. Mahomes, Lamar"
        />

        <Typography variant="h6" sx={{ mt: 4, color: '#000000', fontWeight: 600 }}>
          Search Teams
        </Typography>
        <SearchDropdown 
          query={teamQuery}
          results={teamResults}
          isSearching={isSearchingTeams}
          onSearchChange={handleTeamChange}
          onSelect={(item) => {
             if (parlayMode) {
               // Add to parlay instead of saving immediately
               setParlayLegs(prev => [...prev, {
                 event: item.FullName,
                 teamKey: item.Key,
                 teamFullName: item.FullName,
                 type: 'team',
                 odds: 'Pending',
                 sportsbook: 'DraftKings'
               }]);
             } else {
               addBet(item, 'team');
             }
             setTeamQuery('');
          }}
          placeholder="e.g. Chiefs, 49ers"
        />

        {/* Parlay Mode Toggle */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant={parlayMode ? 'contained' : 'outlined'}
            onClick={() => setParlayMode(!parlayMode)}
            size="large"
          >
            {parlayMode ? '🎯 Parlay Mode Active' : '🎯 Build a Parlay'}
          </Button>
        </Box>

        {/* Parlay Builder */}
        {parlayMode && (
          <ParlayBuilder
            legs={parlayLegs}
            onRemoveLeg={(index) => setParlayLegs(prev => prev.filter((_, i) => i !== index))}
            onSaveParlay={saveParlayHandler}
            onCancel={() => {
              setParlayMode(false);
              setParlayLegs([]);
            }}
          />
        )}
      </Box>

      <Box sx={{ mt: 5, width: '100%' }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
          Your Tracked Bets ({bets.length}{!isPremium ? '/5' : ''})
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click the arrow to view odds across sportsbooks. Click any odds to lock it in.
        </Typography>
        <TableContainer component={Paper} sx={{ width: '100%' }}>
          <Table sx={{ width: '100%', minWidth: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50 }}></TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Odds</TableCell>
                <TableCell>Sportsbook</TableCell>
                <TableCell align="center" sx={{ width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bets.map((bet) => (
                <BetRow 
                  key={bet.id} 
                  bet={bet} 
                  removeBet={removeBet} 
                  updateBetOdds={updateBetOdds}
                  allOdds={allOdds} 
                />
              ))}
              {bets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No bets tracked yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="subtitle1" sx={{ mt: 2, color: analytics.roi >= 0 ? 'green' : 'red' }}>
          Estimated ROI: {analytics.roi}%
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        {!isPremium && (
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={() => navigate('/premium')}
            sx={{ mb: 2 }}
          >
            Upgrade to Premium
          </Button>
        )}
        <FormControlLabel
          control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
          label={
            <Typography sx={{ color: '#000000' }}>
              Accept terms and conditions
            </Typography>
          }
        />
      </Box>
    </Box>
  );
};

// --- APP CONTENT (INSIDE ROUTER) ---
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [bets, setBets] = useState([]);
  const [analytics, setAnalytics] = useState({ roi: 0 });
  const [isPremium, setIsPremium] = useState(false);
  const [consent, setConsent] = useState(false);
  const [allOdds, setAllOdds] = useState([]);
  
  const [playerResults, setPlayerResults] = useState([]);
  const [teamResults, setTeamResults] = useState([]);
  
  // Parlay state
  const [parlayMode, setParlayMode] = useState(false);
  const [parlayLegs, setParlayLegs] = useState([]);
  
  const navigate = useNavigate();  // NOW THIS IS INSIDE <Router>!

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) setIsPremium(userDoc.data().isPremium || false);
        
        const q = query(collection(db, 'bets'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        setBets(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setBets([]);
        setIsPremium(false);
      }
      setLoading(false);
    });

    fetch(`${API_URL}/api/odds/americanfootball_nfl`)
      .then(res => res.json())
      .then(data => {
        console.log('Odds data loaded:', data);
        if (Array.isArray(data)) {
          setAllOdds(data);
        } else {
          console.error('Odds API returned non-array:', data);
          setAllOdds([]);
        }
      })
      .catch(err => {
        console.error('Odds fetch error:', err);
        setAllOdds([]);
      });

    return () => unsubscribe();
  }, []);

  const connectSportsbook = () => alert("DraftKings Sync Started...");

  const searchPlayers = async (query) => {
    if (!query) return;
    try {
      const res = await fetch(`${API_URL}/api/search/${encodeURIComponent(query)}`);
      const data = await res.json();
      setPlayerResults(data || []);
    } catch (e) {
      console.error(e);
      setPlayerResults([]); 
    }
  };

  const searchTeams = async (query) => {
    if (!query) return;
    try {
      const res = await fetch(`${API_URL}/api/teams/${encodeURIComponent(query)}`);
      const data = await res.json();
      setTeamResults(data || []);
    } catch (e) {
      console.error(e);
      setTeamResults([]);
    }
  };

  const addBet = async (item, type) => {
    if (!user) return;
    if (!isPremium && bets.length >= 5) return alert("Limit reached! Upgrade to Premium.");
    
    const newBet = {
      event: type === 'player' ? `${item.FirstName} ${item.LastName}` : item.FullName,
      teamKey: type === 'player' ? item.Team : item.Key,
      teamFullName: type === 'player' ? TEAM_KEY_TO_NAME[item.Team] : item.FullName,
      type: type,
      odds: 'Pending',
      sportsbook: 'DraftKings',
      userId: user.uid,
      createdAt: new Date().toISOString()
    };

    console.log('Adding bet with team info:', newBet);

    try {
      const ref = await addDoc(collection(db, 'bets'), newBet);
      setBets(prev => [...prev, { ...newBet, id: ref.id }]);
    } catch (e) { console.error(e); }
  };

  const removeBet = async (betId) => {
    try {
      await deleteDoc(doc(db, 'bets', betId));
      setBets((prev) => prev.filter((bet) => bet.id !== betId));
    } catch (err) {
      console.error('Error removing bet:', err);
    }
  };

  const updateBetOdds = async (betId, newOdds, bookTitle) => {
    try {
      await updateDoc(doc(db, 'bets', betId), { odds: newOdds, sportsbook: bookTitle });
      setBets(prev => prev.map(b => b.id === betId ? { ...b, odds: newOdds, sportsbook: bookTitle } : b));
    } catch (e) { 
      console.error('Error updating bet odds:', e); 
    }
  };

  const saveParlayHandler = async (combinedOdds) => {
    if (!user || parlayLegs.length < 2) return;
    
    if (!isPremium && bets.length >= 5) {
      alert("Limit reached! Upgrade to Premium.");
      return;
    }
    
    const parlayBet = {
      type: 'parlay',
      event: `Parlay (${parlayLegs.length} legs)`,
      legs: parlayLegs,
      odds: combinedOdds,
      sportsbook: 'DraftKings',
      userId: user.uid,
      createdAt: new Date().toISOString()
    };

    try {
      const ref = await addDoc(collection(db, 'bets'), parlayBet);
      setBets(prev => [...prev, { ...parlayBet, id: ref.id }]);
      setParlayLegs([]);
      setParlayMode(false);
      alert(`Parlay saved! ${parlayLegs.length} legs at ${combinedOdds}`);
    } catch (e) {
      console.error('Error saving parlay:', e);
      alert('Failed to save parlay');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
      <AppBar position="static" sx={{ bgcolor: '#000000' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            BET TRACKER PRO
          </Typography>
          {user && (
            <>
              <Button color="inherit" onClick={() => navigate('/')}>
                Manual Tracking
              </Button>
              <Button color="inherit" onClick={() => navigate('/synced-bets')}>
                Synced Bets
              </Button>
              <Button color="inherit" onClick={() => navigate('/premium')}>
                Premium
              </Button>
              <Button color="inherit" onClick={() => auth.signOut()}>
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={
          user ? (
            <MainDashboard 
              user={user}
              bets={bets}
              isPremium={isPremium}
              analytics={analytics}
              playerResults={playerResults}
              teamResults={teamResults}
              addBet={addBet}
              removeBet={removeBet}
              updateBetOdds={updateBetOdds}
              onPlayerSearch={searchPlayers}
              onTeamSearch={searchTeams}
              connectSportsbook={connectSportsbook}
              consent={consent}
              setConsent={setConsent}
              allOdds={allOdds}
              parlayMode={parlayMode}
              setParlayMode={setParlayMode}
              parlayLegs={parlayLegs}
              setParlayLegs={setParlayLegs}
              saveParlayHandler={saveParlayHandler}
            />
          ) : <Navigate to="/signin" />
        } />
        
        <Route path="/synced-bets" element={
          user ? (
            <BetSync user={user} isPremium={isPremium} />
          ) : <Navigate to="/signin" />
        } />
        
        <Route path="/signin" element={!user ? <SignIn /> : <Navigate to="/" />} />
        <Route path="/premium" element={user ? <Premium user={user} /> : <Navigate to="/signin" />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/cancel" element={<CancelPage />} />
      </Routes>
    </Box>
  );
}

// --- APP ROOT (WRAPS EVERYTHING IN ROUTER) ---
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}