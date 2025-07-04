import React, { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';

export const ReceiveToken = () => {
  const [status, setStatus] = useState('waiting');
  const [error, setError] = useState('');

  useEffect(() => {
    // Parse customToken from URL
    const urlParams = new URLSearchParams(window.location.search);
    const customToken = urlParams.get('token');

    if (customToken) {
      handleTokenReceived(decodeURIComponent(customToken));
    } else {
      setStatus('error');
      setError('No authentication token found in URL.');
    }
  }, []);

  const handleTokenReceived = async (customToken) => {
    console.log('Received custom token');
    setStatus('receiving');
    try {
      // Sign in with the custom token
      const userCredential = await signInWithCustomToken(auth, customToken);
      console.log('Successfully signed in:', userCredential.user.uid);
      
      // Don't store the custom token - store the user's ID token instead
      const idToken = await userCredential.user.getIdToken();
      localStorage.setItem('paymentAppIdToken', idToken);
      
      setStatus('success');
      
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error signing in with custom token:', error);
      setStatus('error');
      setError('Failed to authenticate. Please try again.');
    }
  };

  const handleManualRedirect = () => {
    // Reload the current page to try again
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authenticating...
          </h1>
          {status === 'waiting' && (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Connecting to your account...
              </p>
            </div>
          )}
          {status === 'receiving' && (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Verifying authentication...
              </p>
            </div>
          )}
          {status === 'success' && (
            <div>
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <p className="text-gray-600">
                Authentication successful! Redirecting...
              </p>
            </div>
          )}
          {status === 'error' && (
            <div>
              <div className="text-red-600 text-4xl mb-4">✗</div>
              <p className="text-red-600 mb-4">
                {error || 'Authentication failed'}
              </p>
              <button
                onClick={handleManualRedirect}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 