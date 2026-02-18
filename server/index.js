require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert('/Users/domingoakerele/Downloads/sportsbettracker-bfcd3-firebase-adminsdk-fbsvc-ce9761d029.json')
});

// Push notifications
const tokens = [];
async function sendPush(userId, message) {
  const userToken = tokens.find(t => t.userId === userId)?.token;
  if (userToken) {
    await admin.messaging().send({
      token: userToken,
      notification: { title: 'Bet Alert', body: message }
    });
  }
}

// API keys from environment variables
const SHARPSPORTS_KEY = process.env.SHARPSPORTS_API_KEY;
const SPORTS_RADAR_KEY = process.env.SPORTS_RADAR_API_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const SPORTSDATA_API_KEY = process.env.SPORTSDATA_API_KEY;

// CORRECT player prop markets from The Odds API documentation
const PLAYER_PROP_MARKETS = [
  'player_pass_tds',
  'player_pass_yds',
  'player_pass_completions',
  'player_pass_attempts',
  'player_pass_interceptions',
  'player_rush_yds',
  'player_rush_attempts',
  'player_receptions',
  'player_reception_yds',
  'player_anytime_td',
  'player_kicking_points',
  'player_field_goals',
].join(',');

// ==================== MOCK DATA ====================
const MOCK_ODDS_DATA = [
  {
    id: 'mock_event_1',
    sport_key: 'americanfootball_nfl',
    commence_time: '2026-02-08T23:20:00Z',
    home_team: 'Kansas City Chiefs',
    away_team: 'Baltimore Ravens',
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Kansas City Chiefs', price: -150 },
              { name: 'Baltimore Ravens', price: 125 }
            ]
          },
          {
            key: 'spreads',
            outcomes: [
              { name: 'Kansas City Chiefs', price: -110, point: -3.5 },
              { name: 'Baltimore Ravens', price: -110, point: 3.5 }
            ]
          },
          {
            key: 'totals',
            outcomes: [
              { name: 'Over', price: -108, point: 47.5 },
              { name: 'Under', price: -112, point: 47.5 }
            ]
          }
        ]
      },
      {
        key: 'fanduel',
        title: 'FanDuel',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Kansas City Chiefs', price: -145 },
              { name: 'Baltimore Ravens', price: 120 }
            ]
          },
          {
            key: 'spreads',
            outcomes: [
              { name: 'Kansas City Chiefs', price: -112, point: -3.5 },
              { name: 'Baltimore Ravens', price: -108, point: 3.5 }
            ]
          },
          {
            key: 'totals',
            outcomes: [
              { name: 'Over', price: -110, point: 47.5 },
              { name: 'Under', price: -110, point: 47.5 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'mock_event_2',
    sport_key: 'americanfootball_nfl',
    commence_time: '2026-02-08T20:00:00Z',
    home_team: 'Philadelphia Eagles',
    away_team: 'Green Bay Packers',
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Philadelphia Eagles', price: -200 },
              { name: 'Green Bay Packers', price: 165 }
            ]
          },
          {
            key: 'spreads',
            outcomes: [
              { name: 'Philadelphia Eagles', price: -110, point: -5.5 },
              { name: 'Green Bay Packers', price: -110, point: 5.5 }
            ]
          },
          {
            key: 'totals',
            outcomes: [
              { name: 'Over', price: -115, point: 45.5 },
              { name: 'Under', price: -105, point: 45.5 }
            ]
          }
        ]
      }
    ]
  }
];

const MOCK_EVENT_ODDS = {
  id: 'mock_event_1',
  sport_key: 'americanfootball_nfl',
  commence_time: '2026-02-08T23:20:00Z',
  home_team: 'Kansas City Chiefs',
  away_team: 'Baltimore Ravens',
  bookmakers: [
    {
      key: 'draftkings',
      title: 'DraftKings',
      markets: [
        {
          key: 'h2h',
          outcomes: [
            { name: 'Kansas City Chiefs', price: -150 },
            { name: 'Baltimore Ravens', price: 125 }
          ]
        },
        {
          key: 'spreads',
          outcomes: [
            { name: 'Kansas City Chiefs', price: -110, point: -3.5 },
            { name: 'Baltimore Ravens', price: -110, point: 3.5 }
          ]
        },
        {
          key: 'totals',
          outcomes: [
            { name: 'Over', price: -108, point: 47.5 },
            { name: 'Under', price: -112, point: 47.5 }
          ]
        },
        {
          key: 'player_pass_tds',
          outcomes: [
            { name: 'Over', description: 'Patrick Mahomes', price: -120, point: 1.5 },
            { name: 'Under', description: 'Patrick Mahomes', price: -110, point: 1.5 },
            { name: 'Over', description: 'Lamar Jackson', price: -115, point: 1.5 },
            { name: 'Under', description: 'Lamar Jackson', price: -115, point: 1.5 }
          ]
        },
        {
          key: 'player_pass_yds',
          outcomes: [
            { name: 'Over', description: 'Patrick Mahomes', price: -110, point: 275.5 },
            { name: 'Under', description: 'Patrick Mahomes', price: -110, point: 275.5 },
            { name: 'Over', description: 'Lamar Jackson', price: -108, point: 245.5 },
            { name: 'Under', description: 'Lamar Jackson', price: -112, point: 245.5 }
          ]
        },
        {
          key: 'player_rush_yds',
          outcomes: [
            { name: 'Over', description: 'Lamar Jackson', price: -115, point: 65.5 },
            { name: 'Under', description: 'Lamar Jackson', price: -105, point: 65.5 },
            { name: 'Over', description: 'Travis Kelce', price: -120, point: 45.5 },
            { name: 'Under', description: 'Travis Kelce', price: 100, point: 45.5 }
          ]
        },
        {
          key: 'player_receptions',
          outcomes: [
            { name: 'Over', description: 'Travis Kelce', price: -110, point: 5.5 },
            { name: 'Under', description: 'Travis Kelce', price: -110, point: 5.5 }
          ]
        },
        {
          key: 'player_reception_yds',
          outcomes: [
            { name: 'Over', description: 'Travis Kelce', price: -115, point: 65.5 },
            { name: 'Under', description: 'Travis Kelce', price: -105, point: 65.5 }
          ]
        }
      ]
    },
    {
      key: 'fanduel',
      title: 'FanDuel',
      markets: [
        {
          key: 'h2h',
          outcomes: [
            { name: 'Kansas City Chiefs', price: -145 },
            { name: 'Baltimore Ravens', price: 120 }
          ]
        },
        {
          key: 'player_pass_yds',
          outcomes: [
            { name: 'Over', description: 'Patrick Mahomes', price: -112, point: 275.5 },
            { name: 'Under', description: 'Patrick Mahomes', price: -108, point: 275.5 }
          ]
        }
      ]
    }
  ]
};

// ---------------------- ROUTES ----------------------

// Get bets for a user
app.get('/api/bets/:userId', async (req, res) => {
  try {
    const mockBets = [
      { id: 1, event: 'Giants vs Eagles', odds: '-150', sportsbook: 'DraftKings', userId: req.params.userId },
      { id: 2, event: 'Lakers vs Warriors', odds: 'Over 220', sportsbook: 'DraftKings', userId: req.params.userId },
    ];
    res.json(mockBets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bets' });
  }
});

// Save FCM token
app.post('/api/save-token', (req, res) => {
  const { userId, token } = req.body;
  tokens.push({ userId, token });
  res.json({ success: true });
});

// Analytics
app.get('/api/analytics/:userId', (req, res) => {
  const mockAnalytics = { roi: 15.5 };
  res.json(mockAnalytics);
});

// Stripe checkout
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{
        price: 'price_1SG8IJHb67VJLTRG740MEnQ6',
        quantity: 1,
      }],
      success_url: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:5173/cancel',
      metadata: { userId }
    });
    
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Stripe webhook
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    
    try {
      await admin.firestore().collection('users').doc(userId).set({
        isPremium: true,
        subscribedAt: new Date().toISOString(),
        stripeCustomerId: session.customer
      }, { merge: true });
      console.log(`User ${userId} upgraded to premium`);
    } catch (err) {
      console.error('Error updating user to premium:', err);
    }
  }

  res.json({received: true});
});

// Injuries route
app.get('/api/injuries/:league', async (req, res) => {
  try {
    const league = req.params.league;
    const url = `https://api.sportradar.com/${league}/official/trial/v7/en/seasons/2024/REG/10/injuries.json?api_key=${SPORTS_RADAR_KEY}`;
    const response = await axios.get(url);
    res.json(response.data.injuries);
  } catch (err) {
    console.error('Injuries error:', err.message);
    res.status(500).json({ error: 'Failed to fetch injuries' });
  }
});

// ==================== ODDS API CALLS (COMMENTED OUT TO SAVE CREDITS) ====================

// Main odds route - USING MOCK DATA
app.get('/api/odds/:sport', async (req, res) => {
  try {
    console.log('⚠️ Using MOCK odds data (API call commented out)');
    res.json(MOCK_ODDS_DATA);
    
    
    const sport = req.params.sport;
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,totals,spreads&oddsFormat=american`;
    
    console.log('Fetching main odds...');
    const response = await axios.get(url);
    
    console.log('Events received:', response.data.map(e => ({
      id: e.id,
      game: `${e.away_team} @ ${e.home_team}`
    })));
    
    res.json(response.data);
    */
  } catch (err) {
    console.error('Odds error:', err.message);
    res.status(500).json({ error: 'Failed to fetch odds' });
  }
});

// Event-specific odds - USING MOCK DATA
app.get('/api/odds/:sport/:eventId', async (req, res) => {
  try {
    console.log('⚠️ Using MOCK event odds (API call commented out)');
    res.json(MOCK_EVENT_ODDS);
    
    
    const { sport, eventId } = req.params;
    
    console.log(`\n========== FETCHING EVENT ODDS ==========`);
    console.log(`Event ID: ${eventId}`);
    
    const allMarkets = `h2h,spreads,totals,${PLAYER_PROP_MARKETS}`;
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${allMarkets}&oddsFormat=american`;
    
    const response = await axios.get(url);
    
    if (response.data.bookmakers?.length > 0) {
      const allMarketKeys = new Set();
      response.data.bookmakers.forEach(book => {
        book.markets?.forEach(m => allMarketKeys.add(m.key));
      });
      console.log('Markets found:', Array.from(allMarketKeys));
    }
    
    res.json(response.data);
    */
  } catch (err) {
    console.error('Event odds error:', err.message);
    if (err.response) {
      console.error('API Response:', err.response.status, err.response.data);
    }
    res.status(500).json({ error: 'Failed to fetch event odds', details: err.message });
  }
});

// ==================== KEEP THESE ACTIVE (Different APIs) ====================

// Player search - ACTIVE (uses SportsData.io)
app.get('/api/search/:query', async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    const url = `https://api.sportsdata.io/v3/nfl/scores/json/PlayersByAvailable?key=${SPORTSDATA_API_KEY}`;
    const response = await axios.get(url);

    const filteredPlayers = response.data.filter((p) => {
      const fullName = `${p.FirstName} ${p.LastName}`.toLowerCase();
      return (
        p.FirstName.toLowerCase().includes(query) ||
        p.LastName.toLowerCase().includes(query) ||
        fullName.includes(query)
      );
    });

    res.json(filteredPlayers);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

// Team search - ACTIVE (uses SportsData.io)
app.get('/api/teams/:query', async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    const url = `https://api.sportsdata.io/v3/nfl/scores/json/Teams?key=${SPORTSDATA_API_KEY}`;
    const response = await axios.get(url);
    
    const filteredTeams = response.data.filter((team) => {
      return (
        team.FullName.toLowerCase().includes(query) ||
        team.City.toLowerCase().includes(query) ||
        team.Name.toLowerCase().includes(query) ||
        team.Key.toLowerCase().includes(query)
      );
    });
    
    res.json(filteredTeams);
  } catch (error) {
    console.error('Team search error:', error.message);
    res.status(500).json({ error: 'Failed to search teams' });
  }
});

// News example
app.get('/api/news/:name', (req, res) => {
  res.json({ injury: 'Ankle - Questionable' });
});

// SharpSports callback
app.get('/api/callback', (req, res) => {
  const token = req.query.token;
  console.log('SharpSports token:', token);
  res.send('Connected! Token saved.');
});

// Debug: List all events
app.get('/api/events/:sport', async (req, res) => {
  try {
    console.log('⚠️ Using MOCK events data (API call commented out)');
    res.json(MOCK_ODDS_DATA);
    
    /* REAL API CALL - UNCOMMENT TO USE LIVE DATA
    const { sport } = req.params;
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${ODDS_API_KEY}`;
    const response = await axios.get(url);
    res.json(response.data);
    */
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Debug: Check available markets for an event
app.get('/api/debug/markets/:sport/:eventId', async (req, res) => {
  try {
    console.log('⚠️ Using MOCK market data (API call commented out)');
    
    const marketSummary = {
      'h2h': {
        key: 'h2h',
        bookmakers: ['DraftKings', 'FanDuel'],
        outcomeCount: 2
      },
      'spreads': {
        key: 'spreads',
        bookmakers: ['DraftKings'],
        outcomeCount: 2
      },
      'totals': {
        key: 'totals',
        bookmakers: ['DraftKings'],
        outcomeCount: 2
      },
      'player_pass_yds': {
        key: 'player_pass_yds',
        bookmakers: ['DraftKings', 'FanDuel'],
        outcomeCount: 4
      }
    };
    
    res.json({
      eventId: req.params.eventId,
      home_team: 'Kansas City Chiefs',
      away_team: 'Baltimore Ravens',
      availableMarkets: Object.values(marketSummary)
    });
    
   
    const { sport, eventId } = req.params;
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${PLAYER_PROP_MARKETS},h2h,spreads,totals&oddsFormat=american`;
    
    const response = await axios.get(url);
    
    const marketSummary = {};
    response.data.bookmakers?.forEach(book => {
      book.markets?.forEach(market => {
        if (!marketSummary[market.key]) {
          marketSummary[market.key] = {
            key: market.key,
            bookmakers: [],
            outcomeCount: market.outcomes.length,
            sampleOutcomes: market.outcomes.slice(0, 3).map(o => ({
              name: o.name,
              description: o.description,
              price: o.price,
              point: o.point
            }))
          };
        }
        marketSummary[market.key].bookmakers.push(book.title);
      });
    });
    
    res.json({
      eventId,
      home_team: response.data.home_team,
      away_team: response.data.away_team,
      availableMarkets: Object.values(marketSummary)
    });
    */
  } catch (err) {
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

// ==================== SHARPSPORTS BETSYNC INTEGRATION ====================

// Create context for linking (REQUIRED per SharpSports docs)
app.post('/api/sharpsports/context', async (req, res) => {
  const { internalId } = req.body;
  
  if (!internalId) {
    return res.status(400).json({ error: 'internalId is required' });
  }
  
  try {
    console.log(`📝 Creating SharpSports context for user ${internalId}`);
    
    const response = await axios.post(
      'https://api.sharpsports.io/v1/context',
      { internalId },
      {
        headers: {
          'Authorization': `Token ${SHARPSPORTS_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Context created:', response.data.cid);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Context creation error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create context',
      details: error.response?.data 
    });
  }
});

// Get all supported sportsbooks
app.get('/api/sharpsports/books', async (req, res) => {
  try {
    console.log('📚 Fetching supported sportsbooks from SharpSports...');
    
    const response = await axios.get('https://api.sharpsports.io/v1/books', {
      headers: {
        'Authorization': `Token ${SHARPSPORTS_KEY}`
      }
    });
    
    // Filter active books only
    const activeBooks = response.data.filter(book => book.status === 'active');
    
    res.json({ books: activeBooks });
  } catch (error) {
    console.error('SharpSports books error:', error.message);
    res.status(500).json({ error: 'Failed to fetch sportsbooks' });
  }
});

// Webhook endpoint to receive SharpSports events
app.post('/api/sharpsports/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log(`📨 Webhook received: ${type}`);
    
    // Handle different event types
    switch (type) {
      case 'bettor.created':
        await handleBettorCreated(data);
        break;
      
      case 'bettorAccount.verified':
        await handleAccountVerified(data);
        break;
      
      case 'refreshResponse.created':
        await handleRefreshComplete(data);
        break;
      
      case 'bettorAccount.unverified':
        await handleAccountUnverified(data);
        break;
      
      default:
        console.log('Unknown webhook event:', type);
    }
    
    // Always return 200 OK (SharpSports requirement)
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent retries
    res.json({ received: true, error: error.message });
  }
});

// Webhook handler: bettor.created
async function handleBettorCreated(data) {
  const { id, internalId } = data;
  console.log(`✅ Bettor created for user ${internalId}`);
  
  try {
    // Update user document with bettorId
    const userRef = admin.firestore().collection('users').doc(internalId);
    await userRef.set({
      bettorId: id,
      sharpSportsInternalId: internalId
    }, { merge: true });
    
    console.log(`✅ Updated user ${internalId} with bettorId ${id}`);
  } catch (error) {
    console.error('handleBettorCreated error:', error);
  }
}

// Webhook handler: bettorAccount.verified
async function handleAccountVerified(data) {
  const { id, bettorId, book, verified, internalId } = data;
  console.log(`✅ Account verified for user ${internalId}`);
  
  try {
    // Save to Firebase
    await admin.firestore().collection('linkedSportsbooks').add({
      userId: internalId,
      bettorId,
      bettorAccountId: id,
      bookId: book.id,
      bookName: book.name,
      bookAbbr: book.abbr,
      status: 'active',
      verified,
      refreshCadenceActive: book.refreshCadenceActive || false,
      sdkRequired: book.sdkRequired || false,
      linkedAt: new Date().toISOString(),
      lastRefreshedAt: new Date().toISOString(),
      refreshErrors: 0,
      lastError: null
    });
    
    // Update user's linked count
    const userRef = admin.firestore().collection('users').doc(internalId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists()) {
      await userRef.update({
        linkedSportsbooksCount: admin.firestore.FieldValue.increment(1)
      });
    } else {
      await userRef.set({
        linkedSportsbooksCount: 1,
        sharpSportsInternalId: internalId,
        totalBetsSynced: 0,
        autoRefreshEnabled: false
      }, { merge: true });
    }
    
    console.log(`✅ Linked ${book.name} for user ${internalId}`);
  } catch (error) {
    console.error('handleAccountVerified error:', error);
  }
}

// Webhook handler: refreshResponse.created
async function handleRefreshComplete(data) {
  const { bettorAccountId, betSlips, internalId } = data;
  console.log(`📊 Processing ${betSlips?.length || 0} bet slips for ${internalId}`);
  
  try {
    // Find linked sportsbook
    const linkSnapshot = await admin.firestore()
      .collection('linkedSportsbooks')
      .where('bettorAccountId', '==', bettorAccountId)
      .get();
    
    if (linkSnapshot.empty) {
      console.error('No linked account found for:', bettorAccountId);
      return;
    }
    
    const linkedBook = linkSnapshot.docs[0].data();
    const userId = linkedBook.userId;
    
    // Process each bet slip
    for (const betSlip of betSlips || []) {
      // Check if bet already exists
      const existingBet = await admin.firestore()
        .collection('bets')
        .where('externalBetId', '==', betSlip.id)
        .get();
      
      if (existingBet.empty) {
        // New bet - add to Firebase
        const bet = betSlip.bets?.[0]; // For now, handle single bets (not parlays)
        
        await admin.firestore().collection('bets').add({
          userId,
          event: bet?.bookDescription || betSlip.bookDescription || 'Unknown bet',
          odds: formatOdds(betSlip.oddsAmerican),
          wager: (betSlip.atRisk / 100).toFixed(2), // Convert cents to dollars
          potentialPayout: ((betSlip.atRisk + betSlip.toWin) / 100).toFixed(2),
          actualPayout: betSlip.status === 'won' ? ((betSlip.atRisk + betSlip.toWin) / 100).toFixed(2) : 0,
          
          type: bet?.type || 'unknown',
          teamKey: null,
          teamFullName: '',
          
          source: 'sharpsports',
          sportsbook: linkedBook.bookName,
          externalBetId: betSlip.id,
          bettorAccountId,
          betSlipId: betSlip.id,
          
          status: betSlip.status, // 'pending', 'won', 'lost', 'push'
          
          createdAt: new Date().toISOString(),
          placedAt: betSlip.timePlaced,
          settledAt: betSlip.status !== 'pending' ? betSlip.timeClosed : null,
          
          syncedFromSharpSports: true,
          lastSyncedAt: new Date().toISOString()
        });
      } else {
        // Bet exists - update status if changed
        const existingBetDoc = existingBet.docs[0];
        const currentStatus = existingBetDoc.data().status;
        
        if (currentStatus !== betSlip.status) {
          await existingBetDoc.ref.update({
            status: betSlip.status,
            settledAt: betSlip.timeClosed,
            actualPayout: betSlip.status === 'won' ? ((betSlip.atRisk + betSlip.toWin) / 100).toFixed(2) : 0,
            lastSyncedAt: new Date().toISOString()
          });
        }
      }
    }
    
    // Update last refresh time
    await linkSnapshot.docs[0].ref.update({
      lastRefreshedAt: new Date().toISOString(),
      lastSuccessfulRefresh: new Date().toISOString(),
      refreshErrors: 0
    });
    
    console.log(`✅ Synced ${betSlips?.length || 0} bets for user ${userId}`);
  } catch (error) {
    console.error('handleRefreshComplete error:', error);
  }
}

// Webhook handler: bettorAccount.unverified
async function handleAccountUnverified(data) {
  const { id, internalId } = data;
  console.log(`⚠️ Account unverified: ${id} for user ${internalId}`);
  
  try {
    const linkSnapshot = await admin.firestore()
      .collection('linkedSportsbooks')
      .where('bettorAccountId', '==', id)
      .get();
    
    if (!linkSnapshot.empty) {
      await linkSnapshot.docs[0].ref.update({
        status: 'unverified',
        lastError: 'Account needs reverification'
      });
    }
  } catch (error) {
    console.error('handleAccountUnverified error:', error);
  }
}

// Helper: Format odds
function formatOdds(value) {
  if (value === undefined || value === null) return 'N/A';
  return value > 0 ? `+${value}` : `${value}`;
}

// Manual refresh endpoint
app.get('/api/sharpsports/sync/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`🔄 Manual sync requested for user ${userId}`);
    
    // Get user's linked sportsbooks
    const linksSnapshot = await admin.firestore()
      .collection('linkedSportsbooks')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    if (linksSnapshot.empty) {
      return res.json({ synced: 0, message: 'No linked sportsbooks' });
    }
    
    // First get the bettorId from user
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const bettorId = userDoc.data()?.bettorId;
    
    if (!bettorId) {
      return res.status(400).json({ error: 'User has no bettorId' });
    }
    
    // Trigger refresh for all accounts (per SharpSports docs)
    try {
      await axios.post(
        `https://api.sharpsports.io/v1/bettors/${bettorId}/refresh`,
        {},
        {
          headers: {
            'Authorization': `Token ${SHARPSPORTS_KEY}`
          }
        }
      );
      
      res.json({
        synced: linksSnapshot.docs.length,
        total: linksSnapshot.docs.length,
        message: `Refresh initiated for ${linksSnapshot.docs.length} sportsbook(s)`
      });
    } catch (error) {
      console.error(`Refresh error:`, error.message);
      res.status(500).json({ error: 'Failed to trigger refresh' });
    }
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync bets' });
  }
});

// Disconnect sportsbook
app.post('/api/sharpsports/disconnect', async (req, res) => {
  const { userId, bettorAccountId } = req.body;
  
  try {
    const linkSnapshot = await admin.firestore()
      .collection('linkedSportsbooks')
      .where('userId', '==', userId)
      .where('bettorAccountId', '==', bettorAccountId)
      .get();
    
    if (linkSnapshot.empty) {
      return res.status(404).json({ error: 'Linked account not found' });
    }
    
    const linkDoc = linkSnapshot.docs[0];
    
    // Update status to 'removed'
    await linkDoc.ref.update({
      status: 'removed',
      removedAt: new Date().toISOString()
    });
    
    // Update user's linked count
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (userDoc.exists()) {
      await userDoc.ref.update({
        linkedSportsbooksCount: admin.firestore.FieldValue.increment(-1)
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect sportsbook' });
  }
});

// ---------------------- SERVER ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('⚠️  USING MOCK ODDS DATA - Odds API calls are commented out to save credits');
  console.log('📝 To enable live odds: Uncomment the API calls in server.js');
  console.log('🔗 SharpSports betSync endpoints ready');
  console.log('   - POST /api/sharpsports/context (create linking session)');
  console.log('   - GET  /api/sharpsports/books (list sportsbooks)');
  console.log('   - POST /api/sharpsports/webhook (receive events)');
  console.log('   - GET  /api/sharpsports/sync/:userId (manual refresh)');
  console.log('   - POST /api/sharpsports/disconnect (remove book)');
});