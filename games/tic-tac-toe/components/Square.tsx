import React from 'react';
import { CellValue } from '../types';

interface SquareProps {
  value: CellValue;
  onClick: () => void;
  disabled: boolean;
  isWinningSquare: boolean;
}

const Square: React.FC<SquareProps> = ({ value, onClick, disabled, isWinningSquare }) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // FIX 6: Prevent event bubbling to ensure click events don't propagate
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      className={`
        relative w-full aspect-square rounded-xl text-5xl md:text-6xl font-bold flex items-center justify-center
        transition-all duration-300 transform
        ${disabled ? 'cursor-not-allowed' : 'hover:bg-white/10 active:scale-95 cursor-pointer'}
        ${isWinningSquare ? 'bg-accent/20 border-accent text-accent shadow-[0_0_20px_rgba(46,204,113,0.4)]' : 'bg-white/5 border-white/10 text-white shadow-inner'}
        border-2
      `}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className={`transform transition-all duration-300 ${value ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        {value === 'X' && <span className="text-accent drop-shadow-[0_0_8px_rgba(46,204,113,0.6)]">X</span>}
        {value === 'O' && <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">O</span>}
      </span>
    </button>
  );
};

export default Square;
