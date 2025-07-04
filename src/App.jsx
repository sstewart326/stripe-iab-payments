import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Checkout from "./Checkout";
import Done from "./Done";
import Products from "./Products";
import { ReceiveToken } from "./ReceiveToken";
import "./App.css";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

function Protected({ children }) {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored ID token and attempt to restore session
    const checkStoredAuth = async () => {
      const storedToken = localStorage.getItem('paymentAppIdToken');
      if (storedToken) {
        try {
          // Verify the stored token is still valid
          const currentUser = auth.currentUser;
          if (currentUser) {
            const freshToken = await currentUser.getIdToken(true);
            localStorage.setItem('paymentAppIdToken', freshToken);
          }
        } catch (error) {
          console.error('Stored token invalid:', error);
          localStorage.removeItem('paymentAppIdToken');
        }
      }
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);
      
      if (firebaseUser) {
        // Update stored token when user is authenticated
        try {
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem('paymentAppIdToken', idToken);
        } catch (error) {
          console.error('Error getting ID token:', error);
        }
      } else {
        localStorage.removeItem('paymentAppIdToken');
      }
    });

    checkStoredAuth();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && !user && !loading) {
      window.location.href = 'https://app.inglesabordo.com/login';
    }
  }, [authChecked, user, loading]);

  if (loading || !authChecked) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      {children || <div>Welcome!</div>}
    </div>
  );
}

const App = () => {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Protected><Products /></Protected>} />
          <Route path="/checkout/:priceId" element={<Checkout />} />
          <Route path="/done" element={<Done />} />
          <Route path="/receive-token" element={<ReceiveToken />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;

