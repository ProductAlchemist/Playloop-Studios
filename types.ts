export type PlayerSymbol = 'X' | 'O';
export type CellValue = PlayerSymbol | null;
export type GameMode = 'SINGLE' | 'LOCAL' | 'ONLINE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'DRAW';

export interface Player {
  name: string;
  symbol: PlayerSymbol;
  isAi?: boolean;
}

export interface RoomData {
  status: GameStatus;
  players: {
    player1: { name: string; symbol: PlayerSymbol; joined: boolean };
    player2: { name: string; symbol: PlayerSymbol; joined: boolean };
  };
  board: CellValue[];
  currentTurn: PlayerSymbol;
  winner: PlayerSymbol | 'draw' | null;
  lastMoveTimestamp?: number;
}

export interface GameState {
  board: CellValue[];
  isXNext: boolean; // Derived from currentTurn usually, but kept for local logic
  winner: PlayerSymbol | 'draw' | null;
  winningLine: number[] | null;
}
