import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, List, ListItem, ListItemIcon, ListItemText, Grid } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function Premium({ user }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      console.log('🚀 Starting checkout for user:', user.uid);
      console.log('🚀 User email:', user.email);
      console.log('🚀 API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid,
          email: user.email 
        })
      });
      
      console.log('🚀 Response status:', response.status);
      console.log('🚀 Response ok?:', response.ok);
      
      const responseText = await response.text();
      console.log('🚀 Raw response:', responseText);
      
      let session;
      try {
        session = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('❌ Failed to parse JSON:', parseErr);
        throw new Error('Server returned invalid JSON: ' + responseText.substring(0, 100));
      }
      
      console.log('🚀 Parsed session:', session);
      
      if (!response.ok) {
        throw new Error(session.error || `Server error: ${response.status}`);
      }
      
      if (session.error) {
        throw new Error(session.error);
      }
      
      if (!session.url) {
        throw new Error('No checkout URL in response. Session: ' + JSON.stringify(session));
      }
      
      console.log('🚀 Redirecting to:', session.url);
      
      // Redirect to Stripe checkout
      window.location.href = session.url;
      
    } catch (err) {
      console.error('❌ Full error object:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      alert('Checkout failed: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100vw', minWidth: '100vw', overflowX: 'hidden', minHeight: '100vh', bgcolor: '#fafafa' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4, pt: 4 }}>
        {/* Back Button */}
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/')}
          sx={{ mb: 3 }}
        >
          Back to Dashboard
        </Button>

        <Typography variant="h4" align="center" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
          Choose Your Plan
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Upgrade to Premium and take your betting to the next level
        </Typography>

        <Grid container spacing={3} alignItems="stretch">
          {/* FREE TIER */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h5" gutterBottom>
                  Free
                </Typography>
                <Typography variant="h4" gutterBottom>
                  $0
                  <Typography component="span" variant="subtitle1" color="text.secondary">
                    /month
                  </Typography>
                </Typography>
                
                <List sx={{ mt: 2, flexGrow: 1 }} dense>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckCircleIcon color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Track up to 5 bets" primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckCircleIcon color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Basic odds display" primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckCircleIcon color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Manual search" primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CancelIcon color="disabled" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Real-time updates" 
                      secondary="Premium only"
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                      sx={{ opacity: 0.5 }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CancelIcon color="disabled" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Push notifications" 
                      secondary="Premium only"
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                      sx={{ opacity: 0.5 }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CancelIcon color="disabled" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Advanced analytics" 
                      secondary="Premium only"
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                      sx={{ opacity: 0.5 }}
                    />
                  </ListItem>
                </List>

                <Button 
                  variant="outlined" 
                  fullWidth 
                  size="medium" 
                  sx={{ mt: 2 }}
                  disabled
                >
                  Current Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* PREMIUM TIER */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative', height: '100%' }}>
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: -10, 
                  right: 20, 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  px: 1.5, 
                  py: 0.5,
                  borderRadius: 1,
                  zIndex: 2,
                  fontSize: '0.7rem',
                  fontWeight: 'bold'
                }}
              >
                MOST POPULAR
              </Box>
              
              <Card 
                elevation={8} 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '2px solid',
                  borderColor: 'primary.main'
                }}
              >
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h5" gutterBottom>
                    Premium
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    $9.99
                    <Typography component="span" variant="subtitle1" color="text.secondary">
                      /month
                    </Typography>
                  </Typography>
                  
                  <List sx={{ mt: 2, flexGrow: 1 }} dense>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Unlimited bet tracking" 
                        primaryTypographyProps={{ fontWeight: 'bold', variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Real-time odds updates" 
                        primaryTypographyProps={{ fontWeight: 'bold', variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Push notifications for line changes" 
                        primaryTypographyProps={{ fontWeight: 'bold', variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Advanced analytics & ROI tracking" 
                        primaryTypographyProps={{ fontWeight: 'bold', variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Auto-search as you type" 
                        primaryTypographyProps={{ fontWeight: 'bold', variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Priority support" 
                        primaryTypographyProps={{ fontWeight: 'bold', variant: 'body2' }}
                      />
                    </ListItem>
                  </List>

                  <Button 
                    variant="contained" 
                    fullWidth 
                    size="medium" 
                    sx={{ mt: 2, bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
                    onClick={handleCheckout}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Upgrade to Premium'}
                  </Button>
                  
                  <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1.5 }}>
                    Cancel anytime. No commitments.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* FAQ Section */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h6" gutterBottom>
            Frequently Asked Questions
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Can I cancel anytime?</strong><br />
            Yes! You can cancel your subscription at any time from your account settings.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>What payment methods do you accept?</strong><br />
            We accept all major credit cards (Visa, Mastercard, American Express) through Stripe.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Is my payment information secure?</strong><br />
            Absolutely. We use Stripe for payment processing, which is bank-level secure and PCI compliant.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Premium;