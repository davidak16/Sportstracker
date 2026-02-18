import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function SuccessPage() {
  return (
    <Box sx={{ textAlign: 'center', p: 8 }}>
      <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
      <Typography variant="h3" gutterBottom>
        Welcome to Premium!
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        Your subscription is now active. Enjoy unlimited bet tracking!
      </Typography>
      <Button 
        variant="contained" 
        size="large"
        onClick={() => window.location.href = '/'}
        sx={{ mt: 2 }}
      >
        Start Tracking Bets
      </Button>
    </Box>
  );
}

export default SuccessPage;