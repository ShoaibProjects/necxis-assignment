'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { auth, googleProvider, db } from '../../firebase';
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import {
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

// Material UI imports
import { 
  Box, 
  Typography, 
  Paper, 
  Avatar, 
  Button, 
  TextField, 
  Container, 
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Stack
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import GoogleIcon from '@mui/icons-material/Google';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(({ message, isCurrentUser, formatTime }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        maxWidth: '75%',
        alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
      }}
    >
      <Paper 
        elevation={1} 
        sx={{
          padding: 2,
          backgroundColor: isCurrentUser ? 'primary.main' : 'background.paper',
          color: isCurrentUser ? 'white' : 'text.primary',
          borderRadius: 2,
          borderBottomRightRadius: isCurrentUser ? 0 : 2,
          borderBottomLeftRadius: isCurrentUser ? 2 : 0,
        }}
      >
        {!isCurrentUser && (
          <Typography variant="caption" fontWeight="medium" sx={{ mb: 1, display: 'block' }}>
            {message.userName || 'Anonymous'}
          </Typography>
        )}
        <Typography sx={{ wordBreak: 'break-word' }}>
          {message.text}
        </Typography>
      </Paper>
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ 
          mt: 0.5, 
          textAlign: isCurrentUser ? 'right' : 'left' 
        }}
      >
        {formatTime(message.createdAt)}
      </Typography>
    </Box>
  );
});

// Give the component a display name to help with debugging
ChatMessage.displayName = 'ChatMessage';

// Memoized messages list component
const MessagesList = memo(({ user }) => {
  const messagesRef = collection(db, 'messages');
  const messagesQuery = query(
    messagesRef,
    orderBy('createdAt'),
    limit(50)
  );
  
  const [messages, loadingMessages, error] = useCollectionData(messagesQuery, { idField: 'id' });
  const messagesEndRef = useRef(null);
  
  // Format timestamp to readable time
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);
  
  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (loadingMessages) return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <CircularProgress size={24} />
      <Typography color="text.secondary" sx={{ mt: 1 }}>Loading messages...</Typography>
    </Box>
  );
  
  if (error) return (
    <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
      Error loading messages: {error.message}
    </Typography>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        height: 300,
        overflow: 'auto',
        p: 3,
        bgcolor: 'grey.50',
        borderRadius: 2,
      }}
    >
      {!messages || messages.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, fontStyle: 'italic' }}>
          No messages yet. Be the first to say hello!
        </Typography>
      ) : (
        messages.map((msg) => {
          const isCurrentUser = msg.uid === user?.uid;
          return (
            <ChatMessage 
              key={msg.id || msg.createdAt?.toMillis()}
              message={msg}
              isCurrentUser={isCurrentUser}
              formatTime={formatTime}
            />
          );
        })
      )}
      <div ref={messagesEndRef} />
    </Paper>
  );
});

MessagesList.displayName = 'MessagesList';

// Input form component
const MessageForm = memo(({ user, sendMessage, formValue, setFormValue }) => {
  return (
    <Box component="form" onSubmit={sendMessage} sx={{ mt: 2, display: 'flex' }}>
      <TextField 
        fullWidth
        value={formValue} 
        onChange={(e) => setFormValue(e.target.value)}
        placeholder="Type a message..."
        variant="outlined"
        sx={{ 
          "& .MuiOutlinedInput-root": {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }
        }}
      />
      <Button 
        type="submit"
        variant="contained"
        disabled={!formValue.trim()}
        endIcon={<SendIcon />}
        sx={{ 
          borderTopLeftRadius: 0, 
          borderBottomLeftRadius: 0,
          px: 3
        }}
      >
        Send
      </Button>
    </Box>
  );
});

MessageForm.displayName = 'MessageForm';

const ChatAppComponent = () => {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [formValue, setFormValue] = useState('');
  
  const messagesRef = collection(db, 'messages');

  // Memoize the send message function
  const sendMessage = useCallback(async(e) => {
    e.preventDefault();
    
    if (!formValue.trim() || !user) return;
    
    const { uid, photoURL, displayName } = user;
    
    try {
      await addDoc(messagesRef, {
        text: formValue,
        createdAt: serverTimestamp(),
        uid,
        photoURL,
        userName: displayName || 'Anonymous'
      });
      
      setFormValue('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [formValue, user, messagesRef]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoadingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("https://necxis-assignment-one.vercel.app/")
    } catch (error) {
      console.error('Error signing in with Google:', error);
      alert('Failed to sign in with Google. Please try again.');
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          p: 2
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom 
              align="center" 
              color="primary" 
              fontWeight="bold"
            >
              Our Super Chat
            </Typography>

            {loadingAuth ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading...
                </Typography>
              </Box>
            ) : user ? (
              <Stack spacing={3}>
                <Card variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                    {user.photoURL ? (
                      <Avatar
                        src={user.photoURL}
                        alt="Profile"
                        sx={{ width: 48, height: 48, mr: 2, border: 2, borderColor: 'primary.main' }}
                      />
                    ) : (
                      <Avatar sx={{ width: 48, height: 48, mr: 2, bgcolor: 'primary.main' }}>
                        {user.displayName?.charAt(0) || 'U'}
                      </Avatar>
                    )}
                    <Box>
                      <Typography variant="h6" component="h2">
                        {user.displayName || 'User'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
                
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" component="h2">
                      Messages
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<LogoutIcon />}
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </Button>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <MessagesList user={user} />
                  
                  <MessageForm 
                    user={user}
                    sendMessage={sendMessage}
                    formValue={formValue}
                    setFormValue={setFormValue}
                  />
                </Box>
              </Stack>
            ) : (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary" paragraph>
                  Please sign in to join the conversation
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleLogin}
                  size="large"
                  sx={{ mt: 2 }}
                >
                  Sign In with Google
                </Button>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ChatAppComponent;