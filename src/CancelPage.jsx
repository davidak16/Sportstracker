import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

function CancelPage() {
  return (
    <Box sx={{ textAlign: 'center', p: 8 }}>
      <CancelIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
      <Typography variant="h3" gutterBottom>
        Checkout Cancelled
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        No worries! You can upgrade to Premium anytime.
      </Typography>
      <Button 
        variant="contained" 
        size="large"
        onClick={() => window.location.href = '/'}
        sx={{ mt: 2, mr: 2 }}
      >
        Back to Dashboard
      </Button>
      <Button 
        variant="outlined" 
        size="large"
        onClick={() => window.location.href = '/premium'}
        sx={{ mt: 2 }}
      >
        View Plans Again
      </Button>
    </Box>
  );
}

export default CancelPage;