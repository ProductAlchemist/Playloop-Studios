import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, Database, push, child, get, onDisconnect } from "firebase/database";
import { FIREBASE_CONFIG, EMPTY_BOARD } from "../constants";
import { RoomData, PlayerSymbol, CellValue } from "../types";

let app: FirebaseApp;
let db: Database;

try {
  if (!getApps().length) {
    app = initializeApp(FIREBASE_CONFIG);
  } else {
    app = getApps()[0];
  }
  db = getDatabase(app);
} catch (error) {
  console.error("Firebase Initialization Error. Online mode will not work without valid config.", error);
}

// Generate a 4-digit room code
const generateRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createRoom = async (playerName: string): Promise<string> => {
  if (!db) throw new Error("Database not initialized");
  const code = generateRoomCode();
  const roomRef = ref(db, `rooms/${code}`);

  const initialData: RoomData = {
    status: 'WAITING',
    players: {
      player1: { name: playerName, symbol: 'X', joined: true },
      player2: { name: '', symbol: 'O', joined: false }
    },
    board: EMPTY_BOARD,
    currentTurn: 'X',
    winner: null,
    lastMoveTimestamp: Date.now()
  };

  console.log('🏠 Creating room:', code, 'for player:', playerName);
  await set(roomRef, initialData);
  console.log('✅ Room created successfully');

  // Handle Disconnect
  const p1JoinedRef = ref(db, `rooms/${code}/players/player1/joined`);
  onDisconnect(p1JoinedRef).set(false);

  return code;
};

export const joinRoom = async (code: string, playerName: string): Promise<boolean> => {
  if (!db) throw new Error("Database not initialized");
  console.log('🚪 Attempting to join room:', code, 'as player:', playerName);

  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    console.error('❌ Room does not exist:', code);
    return false;
  }

  const data = snapshot.val() as RoomData;
  if (data.players.player2.joined) {
    console.error('❌ Room is full:', code);
    return false;
  }

  const updates: any = {};
  updates[`rooms/${code}/players/player2`] = { name: playerName, symbol: 'O', joined: true };
  updates[`rooms/${code}/status`] = 'PLAYING';

  console.log('📝 Updating room with Player 2 data...');
  await update(ref(db), updates);
  console.log('✅ Player 2 joined successfully');

  // Handle Disconnect
  const p2JoinedRef = ref(db, `rooms/${code}/players/player2/joined`);
  onDisconnect(p2JoinedRef).set(false);

  return true;
};

export const subscribeToRoom = (code: string, callback: (data: RoomData) => void) => {
  if (!db) {
    console.error('❌ Database not initialized, cannot subscribe');
    return () => {};
  }
  console.log('👂 Subscribing to room:', code);
  const roomRef = ref(db, `rooms/${code}`);
  const unsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log('📨 Received room update:', data);
      callback(data);
    } else {
      console.warn('⚠️ Room data is null for code:', code);
    }
  });
  return unsubscribe;
};

export const updateGameState = async (code: string, board: CellValue[], nextTurn: PlayerSymbol, winner: PlayerSymbol | 'draw' | null) => {
  if (!db) {
    console.error('❌ Database not initialized, cannot update game state');
    return;
  }

  const updates: any = {};
  updates[`rooms/${code}/board`] = board;
  updates[`rooms/${code}/currentTurn`] = nextTurn;
  updates[`rooms/${code}/lastMoveTimestamp`] = Date.now();

  if (winner) {
    updates[`rooms/${code}/winner`] = winner;
    updates[`rooms/${code}/status`] = 'FINISHED';
    console.log('🏆 Game over! Winner:', winner);
  }

  console.log('📤 Updating game state for room:', code, 'Next turn:', nextTurn);
  await update(ref(db), updates);
  console.log('✅ Game state updated successfully');
};

export const leaveRoom = async (code: string, isPlayer1: boolean) => {
  if (!db) return;
  const playerKey = isPlayer1 ? 'player1' : 'player2';
  const updates: any = {};
  updates[`rooms/${code}/players/${playerKey}/joined`] = false;
  await update(ref(db), updates);
};
