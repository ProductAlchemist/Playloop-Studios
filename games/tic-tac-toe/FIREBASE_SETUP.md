# Firebase Setup Guide for Online Multiplayer

Your tic-tac-toe PWA already has all the online multiplayer code implemented! You just need to configure Firebase.

## Quick Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name (e.g., "playloop-tictactoe")
4. (Optional) Enable Google Analytics
5. Click **"Create project"**

### 2. Enable Realtime Database

1. In your Firebase project, go to **"Build"** → **"Realtime Database"**
2. Click **"Create Database"**
3. Choose a location (e.g., `us-central1`)
4. Start in **"Test mode"** (for development)
   - This allows read/write access for 30 days
   - You'll need to update security rules before production

### 3. Get Your Firebase Config

1. In Firebase Console, click the **⚙️ gear icon** → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click the **Web icon** (`</>`) to add a web app
4. Register app name (e.g., "Tic Tac Toe Web")
5. Copy the `firebaseConfig` object values

### 4. Configure Your App

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and paste your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyC...
   VITE_FIREBASE_AUTH_DOMAIN=playloop-tictactoe.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://playloop-tictactoe-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=playloop-tictactoe
   VITE_FIREBASE_STORAGE_BUCKET=playloop-tictactoe.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
   ```

3. Add `.env` to `.gitignore` (to keep credentials private):
   ```bash
   echo ".env" >> .gitignore
   ```

### 5. Update Security Rules (Before Production)

Replace the test mode rules with proper security:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".indexOn": ["lastMoveTimestamp"]
      }
    }
  }
}
```

For production, consider more restrictive rules based on authentication.

### 6. Run Your App

```bash
npm install
npm run dev
```

## Testing Online Multiplayer

1. **Player 1 (Room Host):**
   - Open the app
   - Click "Two Player" → "Play Online" → "Create Room"
   - Enter your name and click "Generate Room Code"
   - Share the 4-digit code with Player 2

2. **Player 2 (Joiner):**
   - Open the app in a different browser/tab/device
   - Click "Two Player" → "Play Online" → "Join Room"
   - Enter your name and the 4-digit code
   - Click "Join Game"

3. **Play the game:**
   - Moves sync in real-time
   - Turn enforcement prevents playing out of turn
   - Disconnect handling shows when opponent leaves

## Features Already Implemented ✅

- ✅ Firebase Realtime Database integration
- ✅ 4-digit room code generation (avoids confusing characters)
- ✅ Room creation and joining
- ✅ Real-time board synchronization
- ✅ Turn management (prevents moves when not your turn)
- ✅ Player disconnection detection
- ✅ Automatic lobby → game transition
- ✅ Winner detection and score tracking

## Troubleshooting

### "Database not initialized" error
- Check that your `.env` file exists and has correct values
- Restart the dev server after creating `.env`

### Room not found
- Verify Realtime Database is enabled in Firebase Console
- Check the Database URL in `.env` matches your Firebase project

### Moves not syncing
- Check Firebase Console → Realtime Database for live data
- Verify security rules allow read/write access

## Production Deployment

Before deploying to production:

1. Update Firebase security rules
2. Set environment variables in your hosting platform
3. Consider adding Firebase Authentication
4. Implement proper error boundaries
5. Add room cleanup (delete old/abandoned rooms)

## Need Help?

- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
