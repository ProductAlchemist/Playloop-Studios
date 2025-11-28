import { Point } from './types';

export const GRID_SIZE = 20;
export const INITIAL_SPEED = 150; // ms per move
export const MIN_SPEED = 50;
export const SPEED_DECREMENT = 5;
export const FOOD_SCORE_VALUE = 10;
export const SPEED_UP_INTERVAL = 5; // Every 5 food items

export const COLORS = {
  backgroundStart: '#1C295A', // Lighter Navy
  backgroundEnd: '#0E1B3E',   // Dark Navy
  snake: '#2ECC71',           // Emerald
  food: '#F59E0B',            // Amber/Gold
  grid: 'rgba(255, 255, 255, 0.03)',
  text: '#FFFFFF',
  overlay: 'rgba(14, 27, 62, 0.85)',
};

export const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

export const INITIAL_DIRECTION = { x: 1, y: 0 }; // Moving Right