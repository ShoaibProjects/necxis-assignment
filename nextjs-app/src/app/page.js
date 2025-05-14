'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { auth, googleProvider, db, firebaseApp } from '../../firebase';
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

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(({ message, isCurrentUser, formatTime }) => {
  return (
    <div 
      className={`flex flex-col max-w-3/4 ${isCurrentUser ? 'items-end self-end' : 'items-start'}`}
    >
      <div className={`px-4 py-2 rounded-lg shadow-sm ${
        isCurrentUser 
          ? 'bg-blue-500 text-white rounded-br-none' 
          : 'bg-white border rounded-bl-none text-black'
      }`}>
        {!isCurrentUser && (
          <div className="font-medium text-xs mb-1">{message.userName || 'Anonymous'}</div>
        )}
        <p className="break-words">{message.text}</p>
      </div>
      <div className={`text-xs mt-1 ${isCurrentUser ? 'text-right' : 'text-left'} text-gray-500`}>
        {formatTime(message.createdAt)}
      </div>
    </div>
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

  if (loadingMessages) return <p className="text-center py-4 text-gray-500">Loading messages...</p>;
  if (error) return <p className="text-center py-4 text-red-500">Error loading messages: {error.message}</p>;

  return (
    <div className="flex flex-col space-y-3 h-96 overflow-y-auto p-3 bg-gray-50 rounded-lg">
      {!messages || messages.length === 0 ? (
        <p className="text-center py-4 text-gray-500 italic">No messages yet. Be the first to say hello!</p>
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
    </div>
  );
});

MessagesList.displayName = 'MessagesList';

// Input form component
const MessageForm = memo(({ user, sendMessage, formValue, setFormValue }) => {
  return (
    <form onSubmit={sendMessage} className="mt-4 flex">
      <input 
        value={formValue} 
        onChange={(e) => setFormValue(e.target.value)}
        className="flex-grow p-3 border text-black border-gray-300 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Type a message..."
      />
      <button 
        type="submit"
        disabled={!formValue.trim()}
        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition"
      >
        Send
      </button>
    </form>
  );
});

MessageForm.displayName = 'MessageForm';

export default function Page() {
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

  const handleGoogleLogin = async () => {
    setLoadingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">Our Super Chat</h1>

        {loadingAuth ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-12 h-12 rounded-full mr-4 border-2 border-blue-500"
                />
              )}
              <div>
                <h2 className="font-medium text-lg text-black">{user.displayName || 'User'}</h2>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
                <button
                  onClick={handleSignOut}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
                >
                  Sign Out
                </button>
              </div>
              
              <MessagesList user={user} />
              
              <MessageForm 
                user={user}
                sendMessage={sendMessage}
                formValue={formValue}
                setFormValue={setFormValue}
              />
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-6">
            <p className="text-gray-600">Please sign in to join the conversation</p>
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center mx-auto bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition shadow-sm"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign In with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}