import { CellValue, PlayerSymbol, Difficulty } from "../types";
import { WINNING_COMBINATIONS } from "../constants";

// Check for winner utility
const checkWinner = (board: CellValue[]): PlayerSymbol | 'draw' | null => {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (!board.includes(null)) return 'draw';
  return null;
};

// Minimax Algorithm
const minimax = (board: CellValue[], depth: number, isMaximizing: boolean): number => {
  const result = checkWinner(board);
  if (result === 'O') return 10 - depth; // AI wins (assuming AI is O)
  if (result === 'X') return depth - 10; // Player wins
  if (result === 'draw') return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        const score = minimax(board, depth + 1, false);
        board[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        const score = minimax(board, depth + 1, true);
        board[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
};

export const getBestMove = (board: CellValue[], difficulty: Difficulty): number => {
  const availableMoves = board.map((val, idx) => (val === null ? idx : null)).filter((val) => val !== null) as number[];

  if (availableMoves.length === 0) return -1;

  // EASY: Random Move
  if (difficulty === 'EASY') {
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
  }

  // MEDIUM: Block or Win, else Random
  if (difficulty === 'MEDIUM') {
    // 1. Can AI win?
    for (const move of availableMoves) {
      const copy = [...board];
      copy[move] = 'O';
      if (checkWinner(copy) === 'O') return move;
    }
    // 2. Will Player win? Block it.
    for (const move of availableMoves) {
      const copy = [...board];
      copy[move] = 'X';
      if (checkWinner(copy) === 'X') return move;
    }
    // 3. Random
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
  }

  // HARD: Minimax
  // Optimization: If first move and center is available, take it (saves computation)
  if (availableMoves.length >= 8 && board[4] === null) return 4;

  let bestScore = -Infinity;
  let move = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O';
      const score = minimax(board, 0, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  
  return move !== -1 ? move : availableMoves[0];
};
