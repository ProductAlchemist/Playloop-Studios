import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Button } from './components/Button';
import { GameStatus } from './types';
import { playSound } from './utils/audio';
import { Volume2, VolumeX, Trophy, Pause } from 'lucide-react';
import { GitHubIcon, LinkedInIcon } from './components/Icons';
import { incrementVisitorCount, getVisitorCount, incrementGamesPlayed, getGamesPlayed } from './services/firebase';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');

  // Counters
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [gamesPlayedCount, setGamesPlayedCount] = useState<number | null>(null);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('snake_highscore');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  // Load counters on mount
  useEffect(() => {
    const initCounters = async () => {
      try {
        // Increment visitor count
        await incrementVisitorCount();
        const visitors = await getVisitorCount();
        setVisitorCount(visitors);

        // Load games played count (don't increment yet)
        const gamesPlayed = await getGamesPlayed();
        setGamesPlayedCount(gamesPlayed);
      } catch (error) {
        console.error('Failed to load counters:', error);
        // Fail silently - don't show counters if Firebase fails
      }
    };
    initCounters();
  }, []);

  const handleGameOver = (finalScore: number) => {
    setStatus(GameStatus.GAME_OVER);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('snake_highscore', finalScore.toString());
    }
  };

  const toggleSound = () => {
    setIsSoundEnabled(!isSoundEnabled);
    if (!isSoundEnabled) playSound('click');
  };

  const startGame = async () => {
    if (isSoundEnabled) playSound('click');
    setScore(0);
    setStatus(GameStatus.PLAYING);

    // Increment games played counter
    try {
      await incrementGamesPlayed();
      const count = await getGamesPlayed();
      setGamesPlayedCount(count);
    } catch (error) {
      console.error('Failed to increment games played:', error);
    }
  };

  const pauseGame = () => {
    if (status === GameStatus.PLAYING) {
      if (isSoundEnabled) playSound('click');
      setStatus(GameStatus.PAUSED);
    }
  };

  const resumeGame = () => {
    if (isSoundEnabled) playSound('click');
    setStatus(GameStatus.PLAYING);
  };

  const goToMenu = () => {
    if (isSoundEnabled) playSound('click');
    setStatus(GameStatus.MENU);
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1C295A] to-[#0E1B3E] text-white flex flex-col p-4">

      {/* Visitor Counter - Top Left */}
      {visitorCount !== null && (
        <div className="absolute top-4 left-2 sm:left-4 bg-white/5 backdrop-blur-sm border border-white/10 px-3 sm:px-4 py-1.5 rounded-full text-xs text-gray-300 z-50">
          👥 {visitorCount.toLocaleString()} visitors
        </div>
      )}

      {/* Games Played Counter - Top Right */}
      {gamesPlayedCount !== null && (
        <div className="absolute top-4 right-2 sm:right-4 bg-white/5 backdrop-blur-sm border border-white/10 px-3 sm:px-4 py-1.5 rounded-full text-xs text-gray-300 z-50">
          🎮 {gamesPlayedCount.toLocaleString()} games played
        </div>
      )}

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Header / HUD */}
        <div className="w-full max-w-[600px] flex justify-between items-center mb-6 z-10">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-[#2ECC71]">SNAKE</h1>
          <span className="text-xs text-blue-200 opacity-60">by PlayLoop</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm text-blue-200">SCORE</span>
            <span className="text-2xl font-mono font-bold">{score}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleSound}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Toggle Sound"
            >
              {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            
            {status === GameStatus.PLAYING && (
              <button 
                onClick={pauseGame}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors md:hidden"
                aria-label="Pause"
              >
                <Pause size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="relative w-full max-w-[600px] flex justify-center">
        <GameCanvas
          status={status}
          isSoundEnabled={isSoundEnabled}
          difficulty={difficulty}
          onScoreUpdate={setScore}
          onGameOver={handleGameOver}
        />

        {/* Start Screen Overlay */}
        {status === GameStatus.MENU && (
          <div className="absolute inset-0 bg-[#0E1B3E]/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-8 text-center z-20 animate-fade-in">
            <div className="mb-8">
              <h1 className="text-5xl font-extrabold text-[#2ECC71] mb-2 drop-shadow-[0_0_15px_rgba(46,204,113,0.5)]">SNAKE</h1>
              <p className="text-blue-200/60 tracking-widest text-sm uppercase">The Classic Reimagined</p>
            </div>
            
            <div className="flex items-center gap-2 mb-8 bg-white/5 px-4 py-2 rounded-full">
              <Trophy size={16} className="text-[#F59E0B]" />
              <span className="text-sm font-medium">High Score: {highScore}</span>
            </div>

            {/* Difficulty Selector */}
            <div className="mb-8 w-full max-w-[300px]">
              <label className="block text-sm text-blue-200/80 mb-3 text-center">Difficulty:</label>
              <div className="flex gap-2 justify-center">
                {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => {
                      setDifficulty(diff);
                      if (isSoundEnabled) playSound('click');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      difficulty === diff
                        ? 'bg-[#2ECC71] text-[#0E1B3E] shadow-lg'
                        : 'bg-white/5 text-blue-200/60 hover:bg-white/10'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={startGame} className="animate-pulse shadow-lg hover:animate-none min-w-[200px]">
              Start Game
            </Button>
            
            <div className="mt-8 text-xs text-white/30">
              <p className="hidden md:block">Use Arrow Keys to Move</p>
              <p className="md:hidden">Swipe to Move</p>
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {status === GameStatus.PAUSED && (
          <div className="absolute inset-0 bg-[#0E1B3E]/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-8 z-20">
            <h2 className="text-3xl font-bold mb-8 tracking-widest">PAUSED</h2>
            <div className="flex flex-col gap-4 w-full max-w-[200px]">
              <Button onClick={resumeGame}>Resume</Button>
              <Button variant="secondary" onClick={startGame}>Restart</Button>
              <Button variant="secondary" onClick={goToMenu} className="border-none text-sm opacity-60 hover:opacity-100">Main Menu</Button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 bg-[#0E1B3E]/95 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-8 text-center z-20 animate-fade-in-up">
            <h2 className="text-4xl font-bold mb-2 text-white">Game Over!</h2>
            
            {score >= highScore && score > 0 && (
              <div className="mb-6 px-4 py-1 bg-[#F59E0B]/20 rounded-full border border-[#F59E0B]/50 text-[#F59E0B] text-sm font-bold animate-bounce">
                New High Score!
              </div>
            )}

            <div className="flex flex-col gap-1 mb-10">
              <span className="text-blue-200 text-sm">FINAL SCORE</span>
              <span className="text-6xl font-bold text-[#2ECC71] font-mono">{score}</span>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-[200px]">
              <Button onClick={startGame}>Play Again</Button>
              <Button variant="secondary" onClick={goToMenu}>Main Menu</Button>
            </div>
          </div>
        )}
      </div>

        {/* Desktop Controls Hint */}
        <div className="mt-8 hidden md:flex items-center gap-8 text-white/20 text-sm font-medium select-none">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded border border-current flex items-center justify-center">↑</div>
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded border border-current flex items-center justify-center">←</div>
              <div className="w-8 h-8 rounded border border-current flex items-center justify-center">↓</div>
              <div className="w-8 h-8 rounded border border-current flex items-center justify-center">→</div>
            </div>
            <span className="mt-1">Move</span>
          </div>
          <div className="h-12 w-px bg-white/10"></div>
          <div className="flex flex-col items-center gap-2">
             <div className="px-3 py-1 border border-current rounded text-xs">SPACE</div>
             <span>Pause</span>
          </div>
        </div>
      </div>

      {/* Footer - Flexbox at bottom */}
      <div className="mt-auto py-6 text-center w-full">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <span>Built by ProductAlchemist</span>
          <a href="https://github.com/ProductAlchemist" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-[#2ECC71] transition-all">
            <GitHubIcon className="inline-block" />
          </a>
          <span className="text-gray-600">|</span>
          <a href="https://www.linkedin.com/in/kshitijkulkarni-productmanager/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-[#2ECC71] transition-all">
            <LinkedInIcon className="inline-block" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;