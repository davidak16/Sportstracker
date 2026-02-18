// ==========================================
// BetSync.jsx - CORRECTED PER SHARPSPORTS DOCS
// ==========================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase.js';
import { 
  collection, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircleIcon from '@mui/icons-material/Circle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ==========================================
// COMPONENT: WelcomeScreen
// ==========================================
function WelcomeScreen({ onGetStarted }) {
  return (
    <Box sx={{ width: '100vw', minWidth: '100vw', overflowX: 'hidden', p: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '70vh'
      }}>
        <Paper elevation={3} sx={{ maxWidth: 600, p: 4, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            📊 Automatic Bet Tracking
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Connect your sportsbook accounts and automatically sync your bets in real-time
          </Typography>
          
          <List sx={{ mb: 4, textAlign: 'left' }}>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="No manual entry required"
                secondary="Bets automatically sync from your sportsbook"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Auto-update bet status"
                secondary="See wins and losses in real-time"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Track performance across all books"
                secondary="Unified dashboard for all your bets"
              />
            </ListItem>
          </List>
          
          <Button 
            variant="contained" 
            size="large"
            onClick={onGetStarted}
            sx={{ py: 2, px: 4, fontSize: '1.1rem' }}
          >
            Connect Your First Sportsbook
          </Button>
          
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 3 }}>
            Supported: DraftKings, FanDuel, BetMGM, Caesars, and more...
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

// ==========================================
// COMPONENT: SyncStatus
// ==========================================
function SyncStatus({ lastSyncTime, syncing, linkedBooks, onRefresh }) {
  
  const formatSyncTime = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };
  
  return (
    <Paper elevation={1} sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircleIcon 
            color={syncing ? 'warning' : 'success'}
            sx={{ fontSize: 12 }}
          />
          <Typography variant="body2">
            <strong>Last synced:</strong> {formatSyncTime(lastSyncTime)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connected: {linkedBooks.map(b => b.bookName).join(', ')}
          </Typography>
        </Box>
        
        <Button 
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Refresh Bets'}
        </Button>
      </Box>
    </Paper>
  );
}

// ==========================================
// COMPONENT: SyncedBetsTable  
// ==========================================
function SyncedBetRow({ bet }) {
  const [open, setOpen] = useState(false);
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'won': return 'success';
      case 'lost': return 'error';
      case 'pushed': return 'default';
      default: return 'warning';
    }
  };
  
  // Convert cents to dollars
  const formatMoney = (cents) => {
    return (cents / 100).toFixed(2);
  };
  
  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{bet.event || bet.bookDescription || 'Unknown Bet'}</TableCell>
        <TableCell>
          <Chip 
            label={bet.odds} 
            color="primary"
            variant="outlined" 
            size="small" 
          />
        </TableCell>
        <TableCell>
          <Chip
            label={bet.sportsbook}
            size="small"
            sx={{ bgcolor: '#e3f2fd' }}
          />
        </TableCell>
        <TableCell>
          <Chip
            label={bet.status?.toUpperCase() || 'PENDING'}
            color={getStatusColor(bet.status)}
            size="small"
          />
        </TableCell>
        <TableCell align="center">
          ${bet.wager}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Bet Details
              </Typography>
              {bet.placedAt && (
                <Typography variant="body2" color="text.secondary">
                  Placed: {new Date(bet.placedAt).toLocaleString()}
                </Typography>
              )}
              {bet.settledAt && (
                <Typography variant="body2" color="text.secondary">
                  Settled: {new Date(bet.settledAt).toLocaleString()}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>
                Wager: ${bet.wager} | Potential Payout: ${bet.potentialPayout?.toFixed(2) || '0.00'}
              </Typography>
              {bet.actualPayout > 0 && (
                <Typography variant="body2" color="success.main">
                  Payout: ${bet.actualPayout.toFixed(2)}
                </Typography>
              )}
              <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                Synced from {bet.sportsbook} • ID: {bet.externalBetId || 'N/A'}
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function SyncedBetsTable({ bets }) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 50 }}></TableCell>
            <TableCell>Event</TableCell>
            <TableCell>Odds</TableCell>
            <TableCell>Sportsbook</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Wager</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bets.map((bet) => (
            <SyncedBetRow 
              key={bet.id} 
              bet={bet}
            />
          ))}
          {bets.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No synced bets yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ==========================================
// COMPONENT: SportsbookManager (CORRECTED)
// ==========================================
function SportsbookManager({ open, onClose, linkedBooks, isPremium, user }) {
  const [availableBooks, setAvailableBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingBookId, setConnectingBookId] = useState(null);
  
  useEffect(() => {
    if (open) {
      fetchAvailableBooks();
    }
  }, [open]);
  
  const fetchAvailableBooks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/sharpsports/books`);
      const data = await response.json();
      setAvailableBooks(data.books || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      setAvailableBooks([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConnect = async (book) => {
    if (!isPremium && linkedBooks.length >= 1) {
      alert('Upgrade to Premium to link unlimited sportsbooks');
      return;
    }
    
    setConnectingBookId(book.id);
    
    try {
      // Step 1: Create context with internalId (REQUIRED per docs)
      const contextResponse = await fetch(`${API_URL}/api/sharpsports/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalId: user.uid  // REQUIRED: Links SharpSports to your user
        })
      });
      
      const { cid } = await contextResponse.json();
      
      // Step 2: Open SharpSports UI (per docs - ui.sharpsports.io)
      const linkUrl = `https://ui.sharpsports.io/link/${cid}`;
      const popup = window.open(
        linkUrl,
        'LinkSportsbook',
        'width=600,height=800,scrollbars=yes'
      );
      
      if (!popup) {
        alert('Popup blocked! Please allow popups for this site.');
        return;
      }
      
      // Note: Webhook will handle the rest - no need to poll
      alert(`Opening ${book.name} linking page...\n\nWebhooks will notify us when complete.`);
      
    } catch (error) {
      console.error('Connection error:', error);
      alert(`Failed to connect ${book.name}: ${error.message}`);
    } finally {
      setConnectingBookId(null);
    }
  };
  
  const handleDisconnect = async (bettorAccountId, bookName) => {
    if (!confirm(`Disconnect ${bookName}? Your bet history will be preserved.`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/sharpsports/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, bettorAccountId })
      });
      
      if (response.ok) {
        alert(`${bookName} disconnected successfully`);
      } else {
        alert('Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Failed to disconnect');
    }
  };
  
  const isBookLinked = (bookId) => {
    return linkedBooks.some(b => b.bookId === bookId);
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Manage Sportsbooks</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {linkedBooks.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Connected ({linkedBooks.length}{!isPremium ? '/1' : ''})
            </Typography>
            {linkedBooks.map(book => (
              <Paper key={book.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1">
                      {book.bookName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last synced: {book.lastRefreshedAt ? new Date(book.lastRefreshedAt).toLocaleString() : 'Never'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label="✓ Connected" color="success" size="small" />
                    <Button 
                      size="small" 
                      onClick={() => handleDisconnect(book.bettorAccountId, book.bookName)}
                    >
                      Disconnect
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Available Sportsbooks
        </Typography>
        
        {!isPremium && linkedBooks.length >= 1 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Upgrade to Premium to link unlimited sportsbooks
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {availableBooks.map(book => {
              const isLinked = isBookLinked(book.id);
              const isPremiumOnly = !isPremium && linkedBooks.length >= 1 && !isLinked;
              
              return (
                <Paper key={book.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1">
                        {book.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        {book.refreshCadenceActive && (
                          <Chip label="Auto-Sync Available" size="small" color="success" variant="outlined" />
                        )}
                        {book.sdkRequired && (
                          <Chip label="SDK Required" size="small" color="warning" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                    
                    <Box>
                      {isLinked ? (
                        <Chip label="Already Connected" color="success" size="small" />
                      ) : isPremiumOnly ? (
                        <Chip label="Premium Only" color="primary" size="small" />
                      ) : (
                        <Button 
                          variant="contained"
                          onClick={() => handleConnect(book)}
                          disabled={connectingBookId === book.id}
                        >
                          {connectingBookId === book.id ? 'Connecting...' : 'Connect'}
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// MAIN COMPONENT: BetSync
// ==========================================
export default function BetSync({ user, isPremium }) {
  const navigate = useNavigate();
  
  const [linkedBooks, setLinkedBooks] = useState([]);
  const [syncedBets, setSyncedBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showBookManager, setShowBookManager] = useState(false);
  
  // Fetch linked sportsbooks (realtime)
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'linkedSportsbooks'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLinkedBooks(books);
      
      if (books.length > 0) {
        const mostRecent = books.reduce((latest, book) => {
          const bookTime = new Date(book.lastRefreshedAt || 0);
          return bookTime > latest ? bookTime : latest;
        }, new Date(0));
        setLastSyncTime(mostRecent);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);
  
  // Fetch synced bets (realtime)
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'bets'),
      where('userId', '==', user.uid),
      where('source', '==', 'sharpsports')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSyncedBets(bets);
    });
    
    return () => unsubscribe();
  }, [user]);
  
  const handleRefresh = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_URL}/api/sharpsports/sync/${user.uid}`);
      const data = await response.json();
      
      if (data.synced > 0) {
        alert(`Refresh initiated for ${data.total} sportsbook(s)...\n\nBets will update via webhooks when complete.`);
      } else {
        alert('No linked sportsbooks to sync');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      alert('Failed to sync bets. Please try again.');
    } finally {
      // Keep syncing state for a bit to show feedback
      setTimeout(() => setSyncing(false), 2000);
    }
  };
  
  const handleAddBook = () => {
    if (!isPremium && linkedBooks.length >= 1) {
      if (confirm('Upgrade to Premium to link unlimited sportsbooks?')) {
        navigate('/premium');
      }
    } else {
      setShowBookManager(true);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ width: '100vw', minWidth: '100vw', overflowX: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (linkedBooks.length === 0) {
    return (
      <>
        <WelcomeScreen onGetStarted={() => setShowBookManager(true)} />
        <SportsbookManager 
          open={showBookManager}
          onClose={() => setShowBookManager(false)}
          linkedBooks={linkedBooks}
          isPremium={isPremium}
          user={user}
        />
      </>
    );
  }
  
  return (
    <Box sx={{ width: '100vw', minWidth: '100vw', overflowX: 'hidden', textAlign: 'center', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" sx={{ color: '#000000', fontWeight: 600 }}>
          Synced Bets
        </Typography>
        {isPremium && (
          <Chip label="PREMIUM MEMBER" color="primary" size="small" />
        )}
      </Box>
      
      <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Automatically synced from your sportsbook accounts
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 4, maxWidth: 800, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Connected Sportsbooks ({linkedBooks.length}{!isPremium ? '/1' : ''})
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={handleAddBook}
          >
            Add Book
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {linkedBooks.map(book => (
            <Chip
              key={book.id}
              label={book.bookName}
              color="success"
              variant="outlined"
              sx={{ fontSize: '1rem', py: 2 }}
            />
          ))}
        </Box>
        
        {!isPremium && linkedBooks.length >= 1 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Upgrade to Premium to link unlimited sportsbooks
          </Alert>
        )}
      </Paper>
      
      <SyncStatus 
        lastSyncTime={lastSyncTime}
        syncing={syncing}
        linkedBooks={linkedBooks}
        onRefresh={handleRefresh}
      />
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Your Synced Bets ({syncedBets.length})
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Automatically synced from your linked sportsbooks
        </Typography>
        
        {syncedBets.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No bets synced yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Bets will appear here automatically when you place them at your sportsbook
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{ mt: 2 }}
            >
              Sync Now
            </Button>
          </Paper>
        ) : (
          <SyncedBetsTable bets={syncedBets} />
        )}
      </Box>
      
      <SportsbookManager 
        open={showBookManager}
        onClose={() => setShowBookManager(false)}
        linkedBooks={linkedBooks}
        isPremium={isPremium}
        user={user}
      />
    </Box>
  );
}