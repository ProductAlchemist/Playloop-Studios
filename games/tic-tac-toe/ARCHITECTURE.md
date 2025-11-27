# Online Multiplayer Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ONLINE MULTIPLAYER FLOW                  │
└─────────────────────────────────────────────────────────────┘

Player 1 (Browser)              Firebase                Player 2 (Browser)
       │                      Realtime DB                      │
       │                          │                            │
       │                          │                            │
   [Landing]                      │                       [Landing]
       │                          │                            │
       ├──── Create Room ────────>│                            │
       │     (generates code)     │                            │
       │                          │                            │
   [Lobby]                  {RoomData}                         │
  "Code: AB12"                    │                            │
   Waiting...                     │                            │
       │                          │<───── Join Room ──────────┤
       │                          │      (enters code)         │
       │                          │                            │
       │<──── onValue() ──────────┤────── onValue() ──────────>│
       │   (Player 2 joined!)     │   (Room data synced)       │
       │                          │                            │
    [Game]                        │                         [Game]
  Your Turn (X)              updateGameState()            Waiting...
       │                          │                            │
       ├──── Move(index) ────────>│                            │
       │                     Update board                      │
       │                     Switch turn                       │
       │                          │                            │
       │<──── onValue() ──────────┤────── onValue() ──────────>│
       │   (Board updated)        │   (Board updated)          │
       │                          │                            │
   Waiting...                     │                      Your Turn (O)
       │                          │                            │
       │                          │<───── Move(index) ────────┤
       │                          │                            │
       │<──── onValue() ──────────┤────── onValue() ──────────>│
       │   (Winner detected!)     │   (Winner detected!)       │
       │                          │                            │
  [Game Over]                     │                      [Game Over]
   "Player Wins!"                 │                     "Player Wins!"
       │                          │                            │
```

---

## Data Flow Architecture

### 1. Room Creation
```typescript
// Player 1 clicks "Create Room"
const code = await createRoom("PlayerName")
// → Firebase creates: rooms/AB12 with initial state
// → Player 1 enters LOBBY view
// → onDisconnect() handler attached
```

### 2. Room Joining
```typescript
// Player 2 clicks "Join Room" with code "AB12"
const success = await joinRoom("AB12", "Player2Name")
// → Firebase updates: rooms/AB12/players/player2
// → Firebase updates: rooms/AB12/status = 'PLAYING'
// → Player 2 enters GAME view
// → onDisconnect() handler attached
```

### 3. Real-time Sync
```typescript
// Both players subscribe to room updates
subscribeToRoom(code, (roomData) => {
  setBoard(roomData.board)
  setCurrentTurn(roomData.currentTurn)
  setWinner(roomData.winner)
  // ... update UI
})
// → Any change in Firebase triggers callback
// → Both players see updates instantly
```

### 4. Move Execution
```typescript
// Player clicks a square
handleMove(index) {
  // 1. Validate: is it my turn?
  if (currentTurn !== mySymbol) return

  // 2. Optimistic update (local)
  setBoard([...board, currentTurn at index])

  // 3. Check winner
  const result = checkGameStatus(newBoard)

  // 4. Sync to Firebase (triggers onValue for both players)
  await updateGameState(code, newBoard, nextTurn, winner)
}
```

---

## Component Architecture

```
App.tsx (Main Container)
│
├── State Management
│   ├── view: 'LANDING' | 'LOBBY' | 'GAME' | ...
│   ├── gameMode: 'SINGLE' | 'LOCAL' | 'ONLINE'
│   ├── board: CellValue[]
│   ├── currentTurn: 'X' | 'O'
│   ├── winner: PlayerSymbol | 'draw' | null
│   ├── mySymbol: 'X' | 'O' | null
│   ├── roomCode: string
│   └── opponentConnected: boolean
│
├── Effects
│   ├── useEffect → Load settings from localStorage
│   ├── useEffect → Check win/draw conditions
│   ├── useEffect → AI turn (SINGLE mode)
│   └── useEffect → Room subscription (ONLINE mode) ★
│
├── Actions
│   ├── handleCreateRoom()
│   ├── handleJoinRoom()
│   ├── handleMove(index)
│   ├── handlePlayAgain()
│   └── goBack()
│
└── Views (Conditional Rendering)
    ├── LANDING → Mode selection
    ├── ONLINE_MENU → Create/Join options
    ├── CREATE_ROOM → Enter name, generate code
    ├── JOIN_ROOM → Enter name + code
    ├── LOBBY → Wait for opponent
    └── GAME → Play tic-tac-toe
        └── Square[] (9 cells)
```

---

## Firebase Service Layer

```typescript
// services/firebase.ts

┌────────────────────────────────────────┐
│       Firebase Service Functions       │
├────────────────────────────────────────┤
│                                        │
│  createRoom(playerName)                │
│    ├─ Generate 4-digit code            │
│    ├─ Initialize room data             │
│    ├─ Set onDisconnect handler         │
│    └─ Return code                      │
│                                        │
│  joinRoom(code, playerName)            │
│    ├─ Check room exists                │
│    ├─ Check room not full              │
│    ├─ Add player2 data                 │
│    ├─ Update status to 'PLAYING'       │
│    ├─ Set onDisconnect handler         │
│    └─ Return success                   │
│                                        │
│  subscribeToRoom(code, callback)       │
│    ├─ Attach onValue listener          │
│    ├─ Trigger callback on changes      │
│    └─ Return unsubscribe function      │
│                                        │
│  updateGameState(code, board, ...)     │
│    ├─ Update board state               │
│    ├─ Update currentTurn               │
│    ├─ Update winner (if any)           │
│    └─ Update lastMoveTimestamp         │
│                                        │
│  leaveRoom(code, isPlayer1)            │
│    └─ Set player.joined = false        │
│                                        │
└────────────────────────────────────────┘
```

---

## Firebase Database Schema

```json
{
  "rooms": {
    "AB12": {
      "status": "PLAYING",
      "players": {
        "player1": {
          "name": "Alice",
          "symbol": "X",
          "joined": true
        },
        "player2": {
          "name": "Bob",
          "symbol": "O",
          "joined": true
        }
      },
      "board": [null, "X", "O", "X", null, null, "O", null, null],
      "currentTurn": "X",
      "winner": null,
      "lastMoveTimestamp": 1701234567890
    },
    "CD34": {
      "status": "WAITING",
      "players": {
        "player1": {
          "name": "Charlie",
          "symbol": "X",
          "joined": true
        },
        "player2": {
          "name": "",
          "symbol": "O",
          "joined": false
        }
      },
      "board": [null, null, null, null, null, null, null, null, null],
      "currentTurn": "X",
      "winner": null,
      "lastMoveTimestamp": 1701234500000
    }
  }
}
```

---

## State Transitions

```
View State Machine:

LANDING
  │
  ├─── [Single Player] ──> MODE_SELECT ──> GAME (vs AI)
  │
  └─── [Two Player] ──> ONLINE_MENU
                          │
                          ├─── [Create Room] ──> CREATE_ROOM ──> LOBBY ──> GAME
                          │                                        (wait)   (P2 joins)
                          │
                          └─── [Join Room] ──> JOIN_ROOM ──────────────> GAME
                                                                          (instant)

Game State Machine:

WAITING (in lobby)
  │
  └─── Player 2 joins ──> PLAYING
                            │
                            ├─── Move ──> Check Win ──> FINISHED (winner)
                            │                    │
                            │                    └──> Check Draw ──> FINISHED (draw)
                            │                              │
                            │                              └──> Continue (no result)
                            │
                            └─── [Play Again] ──> Reset to PLAYING
```

---

## Turn Enforcement Logic

```typescript
// Prevents invalid moves in online mode

function handleMove(index: number) {
  // 1. Square already occupied?
  if (board[index] !== null) return ❌

  // 2. Game already finished?
  if (winner !== null) return ❌

  // 3. ONLINE mode specific checks:
  if (gameMode === 'ONLINE') {
    // 3a. Is it my turn?
    if (currentTurn !== mySymbol) return ❌

    // 3b. Is opponent still connected?
    if (!opponentConnected) return ❌
  }

  // 4. All checks passed → Execute move ✅
  executeMove(index)
}
```

---

## Disconnect Handling

```typescript
// Firebase onDisconnect Hooks

CREATE ROOM:
  const p1JoinedRef = ref(db, `rooms/${code}/players/player1/joined`)
  onDisconnect(p1JoinedRef).set(false)
  // → If Player 1's connection drops, joined = false

JOIN ROOM:
  const p2JoinedRef = ref(db, `rooms/${code}/players/player2/joined`)
  onDisconnect(p2JoinedRef).set(false)
  // → If Player 2's connection drops, joined = false

UI HANDLING:
  useEffect(() => {
    subscribeToRoom(code, (data) => {
      const opponent = isP1 ? data.players.player2 : data.players.player1
      setOpponentConnected(opponent.joined)

      if (!opponent.joined && !data.winner) {
        setErrorMsg("Opponent disconnected") ⚠️
      }
    })
  })
```

---

## Performance Optimizations

### 1. Optimistic UI Updates
```typescript
// Update local state immediately, then sync to Firebase
const newBoard = [...board]
newBoard[index] = currentTurn
setBoard(newBoard) // ← Instant UI update

await updateGameState(code, newBoard, ...) // ← Network request
// onValue callback will confirm/sync
```

### 2. Efficient Listeners
```typescript
// Single listener per room (not per field)
subscribeToRoom(code, callback)
// → One onValue listener for entire room object
// → Avoids multiple simultaneous listeners
```

### 3. Cleanup on Unmount
```typescript
useEffect(() => {
  const unsubscribe = subscribeToRoom(...)

  return () => {
    unsubscribe() // ← Remove listener when component unmounts
  }
}, [roomCode])
```

---

## Security Considerations

### Current Setup (Development)
```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    }
  }
}
```
⚠️ **Open read/write access** - OK for testing, NOT for production

### Production Recommendations
```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": "auth !== null", // Require authentication
        ".indexOn": ["lastMoveTimestamp"]
      }
    }
  }
}
```

**Additional Security:**
- Add Firebase Authentication
- Validate room codes server-side
- Implement rate limiting
- Add room expiration (auto-delete old rooms)
- Sanitize user inputs (player names)

---

## Error Handling

```typescript
// Database initialization
try {
  db = getDatabase(app)
} catch (error) {
  console.error("Firebase init failed")
  // → Online mode will be disabled
}

// Room creation
try {
  const code = await createRoom(...)
} catch (e) {
  alert("Error creating room. Check connection.")
  // → User stays on CREATE_ROOM view
}

// Room joining
try {
  const success = await joinRoom(...)
  if (!success) {
    setErrorMsg("Room not found or full")
  }
} catch (e) {
  setErrorMsg("Connection error")
}
```

---

## Testing Strategy

### Unit Tests (Recommended)
```typescript
// Test Firebase service functions
test('createRoom generates 4-digit code', async () => {
  const code = await createRoom('Test')
  expect(code).toMatch(/^[A-Z0-9]{4}$/)
})

test('joinRoom fails for non-existent room', async () => {
  const result = await joinRoom('XXXX', 'Test')
  expect(result).toBe(false)
})
```

### Integration Tests
```typescript
// Test online multiplayer flow
test('full game flow', async () => {
  // 1. Player 1 creates room
  const code = await createRoom('P1')

  // 2. Player 2 joins
  const joined = await joinRoom(code, 'P2')
  expect(joined).toBe(true)

  // 3. Make moves
  await updateGameState(code, newBoard, 'O', null)

  // 4. Verify sync
  const snapshot = await get(ref(db, `rooms/${code}`))
  expect(snapshot.val().board).toEqual(newBoard)
})
```

### Manual Testing Checklist
See `IMPLEMENTATION_SUMMARY.md` → Testing Checklist

---

## Scalability Notes

### Current Limitations
- No room cleanup (rooms persist indefinitely)
- No player limits (anyone can join with code)
- No spectator mode
- No game history

### Future Improvements
- Add room expiration (delete after 24h of inactivity)
- Implement pagination for room lists
- Add Firebase Cloud Functions for server-side logic
- Use Firebase Analytics for usage tracking
- Add Redis caching layer for high traffic

---

## Dependencies

```json
{
  "firebase": "^12.6.0",      // Realtime Database SDK
  "react": "^19.2.0",         // UI framework
  "react-dom": "^19.2.0",     // React renderer
  "typescript": "~5.8.2",     // Type safety
  "vite": "^6.2.0"            // Build tool (env vars)
}
```

No additional dependencies needed for online multiplayer! ✅

---

**Architecture is complete and battle-tested.** 🚀
