# Environment Setup

## Firebase Configuration

This project uses environment variables to securely store Firebase configuration. Follow these steps to set up your environment:

### 1. Create a `.env` file

Create a `.env` file in the root directory of your project with the following variables:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

### 2. Get your Firebase configuration

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on the gear icon (⚙️) next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. Copy the configuration values from your web app

### 3. Replace the placeholder values

Replace the placeholder values in your `.env` file with your actual Firebase configuration values.

### 4. Security Notes

- The `.env` file is already included in `.gitignore` to prevent it from being committed to version control
- Never commit your actual Firebase configuration to a public repository
- For production deployments, set these environment variables in your hosting platform's configuration

### 5. Example `.env` file

```env
VITE_FIREBASE_API_KEY=AIzaSyBl7ebTmEgFZ75UTFnQSxTBBSY1tNpA89M
VITE_FIREBASE_AUTH_DOMAIN=inglesabordo.com
VITE_FIREBASE_PROJECT_ID=iab-payments
VITE_FIREBASE_STORAGE_BUCKET=iab-payments.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=617280688151
VITE_FIREBASE_APP_ID=1:617280688151:web:476abdb622cf8948a54c52
VITE_FIREBASE_MEASUREMENT_ID=G-4RMZ01XVD9
```

**Important**: The example values above are from your current configuration. You should replace them with your own Firebase project values. 