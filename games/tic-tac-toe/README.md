# 🎮 Tic Tac Toe - Online Multiplayer

Classic tic-tac-toe with online multiplayer powered by Firebase Realtime Database.

![Status](https://img.shields.io/badge/status-ready-success)
![Firebase](https://img.shields.io/badge/firebase-12.6.0-orange)
![React](https://img.shields.io/badge/react-19.2.0-blue)

---

## ✨ Features

### Game Modes
- **🤖 Single Player** - AI with 3 difficulty levels (Easy, Medium, Hard)
- **👥 Local Multiplayer** - Pass-and-play on the same device
- **🌐 Online Multiplayer** - Real-time gameplay with room codes

### Online Features
- ✅ Room creation with 4-digit codes
- ✅ Real-time move synchronization
- ✅ Turn enforcement & disconnect detection
- ✅ Automatic lobby system
- ✅ Winner detection & play again

### UI/UX
- 🎨 Premium glassmorphism design
- 🔊 Sound effects (toggleable)
- 📱 Fully responsive
- ⚡ PWA-ready

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Firebase account (free tier)

### Installation

1. **Navigate to game directory**
   ```bash
   cd games/tic-tac-toe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase** (5 minutes)
   - Create Firebase project at https://console.firebase.google.com/
   - Enable Realtime Database (Test mode)
   - Copy `.env.example` to `.env`
   - Add your Firebase credentials to `.env`

   See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions.

4. **Run the game**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 🎮 How to Play Online

### Creating a Room (Player 1)
1. Click **"Two Player"** → **"Play Online"** → **"Create Room"**
2. Enter your name and click **"Generate Room Code"**
3. Share the 4-digit code with your friend
4. Wait in lobby until Player 2 joins

### Joining a Room (Player 2)
1. Click **"Two Player"** → **"Play Online"** → **"Join Room"**
2. Enter your name and the 4-digit room code
3. Click **"Join Game"** - game starts automatically!

### Gameplay
- Player 1 (X) always goes first
- Moves sync in real-time
- Turn enforcement prevents out-of-turn moves
- Winner detected automatically
- Click **"Play Again"** to reset

---

## 🏗️ Project Structure

```
tic-tac-toe/
├── components/
│   ├── Icons.tsx           # SVG icon components
│   └── Square.tsx          # Game board cells
├── services/
│   ├── ai.ts               # Minimax AI algorithm
│   ├── firebase.ts         # Firebase integration
│   └── sound.ts            # Sound effects
├── utils/
│   └── sound.ts            # Audio utilities
├── App.tsx                 # Main game component
├── constants.ts            # Game constants + Firebase config
├── types.ts                # TypeScript definitions
├── index.tsx               # React entry point
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── .env.example            # Firebase credentials template
└── package.json            # Dependencies
```

---

## 🔧 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.8.2 | Type safety |
| Vite | 6.2.0 | Build tool |
| Firebase | 12.6.0 | Realtime Database |
| Tailwind CSS | 3.x | Styling |

---

## 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Firebase configuration
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture

---

## 🐛 Troubleshooting

### "Database not initialized" error
- Verify `.env` file exists with correct Firebase credentials
- Restart dev server: `Ctrl+C` then `npm run dev`

### Room not found
- Enable Realtime Database in Firebase Console
- Verify Database is in Test mode
- Check room code is exactly 4 characters

### Moves not syncing
- Open Firebase Console → Realtime Database
- Verify data updates in real-time
- Check both players show as connected

---

## 📦 Build & Deploy

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel
```
Add environment variables in Vercel dashboard: Project Settings → Environment Variables

---

## 🛡️ Security Notes

⚠️ Current setup uses Firebase Test Mode (open read/write) - **NOT production-ready!**

Before production:
- Add Firebase Authentication
- Update security rules
- Implement rate limiting
- Auto-delete old rooms
- Sanitize user inputs

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for details.

---

## 🎯 Future Enhancements

- [ ] Firebase Authentication
- [ ] Game statistics
- [ ] Spectator mode
- [ ] In-game chat
- [ ] Tournaments
- [ ] Custom themes

---

## 📄 License

MIT License - Free to use for learning or commercial purposes.

---

**Built with ❤️ by PlayLoop Studios**
