# 🎮 Quick Start Guide - Online Multiplayer

Your tic-tac-toe game is **ready for online multiplayer**! Just follow these 3 simple steps:

## Step 1: Set Up Firebase (5 minutes)

1. Go to https://console.firebase.google.com/
2. Create a new project
3. Enable **Realtime Database** (choose "Test mode" for now)
4. Get your config from Project Settings → Your apps → Web

## Step 2: Configure Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste your Firebase credentials from Step 1

## Step 3: Run the App

```bash
npm install
npm run dev
```

That's it! Open http://localhost:5173 and test online multiplayer.

---

## How to Test Online Multiplayer

### Option A: Two Browser Windows (Same Computer)
1. Open the app in **Chrome**: Click "Two Player" → "Create Room"
2. Copy the 4-digit room code
3. Open the app in **Firefox/Incognito**: Click "Join Room" and paste the code
4. Play! Moves sync in real-time ⚡

### Option B: Two Devices
1. **Device 1**: Create a room and note the code
2. **Device 2**: Connect to the same network, open the app, join with the code
3. Play together!

---

## What Works Right Now ✅

- ✅ Create/Join rooms with 4-digit codes
- ✅ Real-time move synchronization
- ✅ Turn enforcement (can't move on opponent's turn)
- ✅ Disconnect detection
- ✅ Winner detection and scoring
- ✅ Play again functionality

---

## Need More Details?

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions and troubleshooting.
