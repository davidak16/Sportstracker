import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
} from '@mui/material';

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const signup = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        navigate('/');
      })
      .catch(err => alert('Signup error: ' + err.message));
  };

  const login = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        navigate('/');
      })
      .catch(err => alert('Login error: ' + err.message));
  };

  const googleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(() => {
        navigate('/');
      })
      .catch(err => alert('Google login error: ' + err.message));
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        p: 2
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Bet Tracker Pro
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to track your bets
        </Typography>

        <TextField
          fullWidth
          type="email"
          label="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="password"
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button 
            variant="contained" 
            fullWidth 
            onClick={login}
            sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
          >
            Log In
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            onClick={signup}
          >
            Sign Up
          </Button>
        </Box>

        <Divider sx={{ my: 2 }}>or</Divider>

        <Button 
          variant="outlined" 
          fullWidth 
          onClick={googleLogin}
          sx={{ 
            borderColor: '#ddd', 
            color: '#333',
            '&:hover': { borderColor: '#bbb', bgcolor: '#fafafa' }
          }}
        >
          Continue with Google
        </Button>
      </Paper>
    </Box>
  );
}

export default SignIn;