import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GRID_SIZE, COLORS, INITIAL_SNAKE, INITIAL_DIRECTION, INITIAL_SPEED, MIN_SPEED, SPEED_DECREMENT, FOOD_SCORE_VALUE, SPEED_UP_INTERVAL } from '../constants';
import { Point, GameStatus } from '../types';
import { playSound } from '../utils/audio';

interface GameCanvasProps {
  status: GameStatus;
  isSoundEnabled: boolean;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
}

// Difficulty settings
const DIFFICULTY_SETTINGS = {
  EASY: { INITIAL_SPEED: 200, MIN_SPEED: 100 },
  MEDIUM: { INITIAL_SPEED: 150, MIN_SPEED: 50 },
  HARD: { INITIAL_SPEED: 100, MIN_SPEED: 30 },
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  status,
  isSoundEnabled,
  difficulty,
  onScoreUpdate,
  onGameOver
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game State Refs (Mutable for performance in game loop)
  const snakeRef = useRef<Point[]>([...INITIAL_SNAKE]);
  const foodRef = useRef<Point>({ x: 15, y: 5 });
  const directionRef = useRef<Point>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Point>(INITIAL_DIRECTION); // Queue for handling fast inputs
  const speedRef = useRef<number>(INITIAL_SPEED);
  const scoreRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const foodEatenCountRef = useRef<number>(0);
  const touchStartRef = useRef<Point | null>(null);

  const requestRef = useRef<number>();

  // Helpers
  const getRandomPosition = (): Point => {
    let newPos: Point;
    let isOnSnake = true;
    while (isOnSnake) {
      newPos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      isOnSnake = snakeRef.current.some(segment => segment.x === newPos.x && segment.y === newPos.y);
    }
    return newPos!;
  };

  const resetGame = useCallback(() => {
    snakeRef.current = [...INITIAL_SNAKE];
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    scoreRef.current = 0;
    // Use difficulty-based speed
    speedRef.current = DIFFICULTY_SETTINGS[difficulty].INITIAL_SPEED;
    foodEatenCountRef.current = 0;
    foodRef.current = getRandomPosition();
    onScoreUpdate(0);
  }, [onScoreUpdate, difficulty]);

  // Input Handling
  const handleDirectionChange = useCallback((newDir: Point) => {
    const currentDir = directionRef.current;
    // Prevent 180 degree turns and duplicates
    if (
      (newDir.x !== 0 && currentDir.x !== 0) || 
      (newDir.y !== 0 && currentDir.y !== 0)
    ) {
      return;
    }
    nextDirectionRef.current = newDir;
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (status !== GameStatus.PLAYING) return;
    
    switch (e.key) {
      case 'ArrowUp': handleDirectionChange({ x: 0, y: -1 }); break;
      case 'ArrowDown': handleDirectionChange({ x: 0, y: 1 }); break;
      case 'ArrowLeft': handleDirectionChange({ x: -1, y: 0 }); break;
      case 'ArrowRight': handleDirectionChange({ x: 1, y: 0 }); break;
    }
  }, [status, handleDirectionChange]);

  // Touch Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || status !== GameStatus.PLAYING) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const dx = touchEnd.x - touchStartRef.current.x;
    const dy = touchEnd.y - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (Math.abs(dx) > 30) { // Threshold
        handleDirectionChange(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
      }
    } else {
      // Vertical swipe
      if (Math.abs(dy) > 30) {
        handleDirectionChange(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
      }
    }
    touchStartRef.current = null;
  };

  // Game Loop
  const update = (time: number) => {
    if (status !== GameStatus.PLAYING) {
      // Still draw if paused/gameover to keep the board visible
      draw(); 
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const deltaTime = time - lastUpdateTimeRef.current;

    if (deltaTime >= speedRef.current) {
      lastUpdateTimeRef.current = time;
      
      // Update Direction
      directionRef.current = nextDirectionRef.current;
      const head = snakeRef.current[0];
      const newHead = {
        x: head.x + directionRef.current.x,
        y: head.y + directionRef.current.y,
      };

      // Collision Detection: Walls
      if (
        newHead.x < 0 || 
        newHead.x >= GRID_SIZE || 
        newHead.y < 0 || 
        newHead.y >= GRID_SIZE
      ) {
        if (isSoundEnabled) playSound('die');
        onGameOver(scoreRef.current);
        return;
      }

      // Collision Detection: Self
      if (snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        if (isSoundEnabled) playSound('die');
        onGameOver(scoreRef.current);
        return;
      }

      // Move Snake
      const newSnake = [newHead, ...snakeRef.current];

      // Check Food
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        if (isSoundEnabled) playSound('eat');
        scoreRef.current += FOOD_SCORE_VALUE;
        foodEatenCountRef.current += 1;
        onScoreUpdate(scoreRef.current);
        
        // Increase Speed (use difficulty-based min speed)
        if (foodEatenCountRef.current % SPEED_UP_INTERVAL === 0) {
          speedRef.current = Math.max(DIFFICULTY_SETTINGS[difficulty].MIN_SPEED, speedRef.current - SPEED_DECREMENT);
        }

        foodRef.current = getRandomPosition();
        // Don't pop tail, so snake grows
      } else {
        newSnake.pop(); // Remove tail
      }

      snakeRef.current = newSnake;
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Responsive Canvas Sizing
    // We do this in the draw loop to handle resize dynamically, 
    // or we could assume the container size doesn't change often. 
    // For performance, better to only resize when container changes.
    // Here we rely on CSS for size and internal coordinate system for drawing.
    
    const size = Math.min(window.innerWidth - 32, 600); // Max width 600px, 16px padding each side
    // Adjust logic to fit container
    const rect = containerRef.current?.getBoundingClientRect();
    const canvasSize = rect ? Math.min(rect.width, rect.height) : size;
    
    // Ensure canvas resolution matches display size for crisp rendering
    if (canvas.width !== canvasSize || canvas.height !== canvasSize) {
      canvas.width = canvasSize;
      canvas.height = canvasSize;
    }

    const cellSize = canvasSize / GRID_SIZE;

    // Clear
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw Grid (Optional, faint lines)
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasSize);
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasSize, i * cellSize);
    }
    ctx.stroke();

    // Draw Food
    const food = foodRef.current;
    const padding = cellSize * 0.15;
    ctx.fillStyle = COLORS.food;
    ctx.shadowColor = COLORS.food;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(
      food.x * cellSize + padding, 
      food.y * cellSize + padding, 
      cellSize - padding * 2, 
      cellSize - padding * 2,
      cellSize * 0.3
    );
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Draw Snake
    ctx.fillStyle = COLORS.snake;
    ctx.shadowColor = COLORS.snake;
    ctx.shadowBlur = 10;
    
    snakeRef.current.forEach((segment, index) => {
      const isHead = index === 0;
      const segPadding = 1; // 1px gap between segments looks nice
      
      // Different color for head? slightly lighter
      if (isHead) {
        ctx.fillStyle = '#4ADE80'; // Lighter green
      } else {
        ctx.fillStyle = COLORS.snake;
      }

      ctx.beginPath();
      ctx.roundRect(
        segment.x * cellSize + segPadding, 
        segment.y * cellSize + segPadding, 
        cellSize - segPadding * 2, 
        cellSize - segPadding * 2,
        isHead ? 6 : 4
      );
      ctx.fill();
      
      // Eyes for the head
      if (isHead) {
        ctx.fillStyle = '#0E1B3E';
        const eyeSize = cellSize * 0.15;
        const eyeOffset = cellSize * 0.25;
        
        // Determine eye position based on direction
        let eyeX1, eyeY1, eyeX2, eyeY2;
        const dir = directionRef.current;
        
        if (dir.x === 1) { // Right
          eyeX1 = eyeX2 = segment.x * cellSize + cellSize - eyeOffset - eyeSize;
          eyeY1 = segment.y * cellSize + eyeOffset;
          eyeY2 = segment.y * cellSize + cellSize - eyeOffset - eyeSize;
        } else if (dir.x === -1) { // Left
          eyeX1 = eyeX2 = segment.x * cellSize + eyeOffset;
          eyeY1 = segment.y * cellSize + eyeOffset;
          eyeY2 = segment.y * cellSize + cellSize - eyeOffset - eyeSize;
        } else if (dir.y === -1) { // Up
          eyeY1 = eyeY2 = segment.y * cellSize + eyeOffset;
          eyeX1 = segment.x * cellSize + eyeOffset;
          eyeX2 = segment.x * cellSize + cellSize - eyeOffset - eyeSize;
        } else { // Down
          eyeY1 = eyeY2 = segment.y * cellSize + cellSize - eyeOffset - eyeSize;
          eyeX1 = segment.x * cellSize + eyeOffset;
          eyeX2 = segment.x * cellSize + cellSize - eyeOffset - eyeSize;
        }

        ctx.beginPath();
        ctx.arc(eyeX1 + eyeSize/2, eyeY1 + eyeSize/2, eyeSize, 0, Math.PI * 2);
        ctx.arc(eyeX2 + eyeSize/2, eyeY2 + eyeSize/2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.shadowBlur = 0;
  };

  // Lifecycle
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (status === GameStatus.MENU) {
      resetGame();
      // Draw initial state
      draw();
    } else if (status === GameStatus.PLAYING) {
      requestRef.current = requestAnimationFrame(update);
    } else if (status === GameStatus.PAUSED) {
       // Just stop loop, but keep canvas
       if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, resetGame]);

  return (
    <div 
      ref={containerRef}
      className="w-full aspect-square max-w-[600px] relative rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* On-screen D-Pad for Mobile (Only visible on small screens and when playing) */}
      <div className="absolute bottom-4 right-4 md:hidden flex flex-col gap-2 items-center opacity-30 hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); handleDirectionChange({x:0, y:-1}); }} className="p-3 bg-white/20 rounded-full text-white backdrop-blur">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
        <div className="flex gap-4">
          <button onClick={(e) => { e.stopPropagation(); handleDirectionChange({x:-1, y:0}); }} className="p-3 bg-white/20 rounded-full text-white backdrop-blur">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDirectionChange({x:0, y:1}); }} className="p-3 bg-white/20 rounded-full text-white backdrop-blur">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDirectionChange({x:1, y:0}); }} className="p-3 bg-white/20 rounded-full text-white backdrop-blur">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};