import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBl7ebTmEgFZ75UTFnQSxTBBSY1tNpA89M",
    authDomain: "inglesabordo.com",
    projectId: "iab-payments",
    storageBucket: "iab-payments.firebasestorage.app",
    messagingSenderId: "617280688151",
    appId: "1:617280688151:web:476abdb622cf8948a54c52",
    measurementId: "G-4RMZ01XVD9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence to browserLocalPersistence for cross-subdomain support
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set Firebase Auth persistence:', error);
});

export { app, auth }; 