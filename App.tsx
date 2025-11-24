import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, Difficulty, PlayerSymbol, CellValue, GameStatus, RoomData } from './types';
import { WINNING_COMBINATIONS, EMPTY_BOARD } from './constants';
import { getBestMove } from './services/ai';
import { createRoom, joinRoom, subscribeToRoom, updateGameState, leaveRoom } from './services/firebase';
import { playSound } from './utils/sound';
import Square from './components/Square';
import { UserIcon, UsersIcon, GlobeIcon, CopyIcon, Volume2Icon, VolumeXIcon, ArrowLeftIcon, RefreshCwIcon } from './components/Icons';

type View = 'LANDING' | 'MODE_SELECT' | 'ONLINE_MENU' | 'CREATE_ROOM' | 'JOIN_ROOM' | 'LOBBY' | 'GAME';

function App() {
  // --- State ---
  const [view, setView] = useState<View>('LANDING');
  const [gameMode, setGameMode] = useState<GameMode>('SINGLE');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Game State
  const [board, setBoard] = useState<CellValue[]>(EMPTY_BOARD);
  const [currentTurn, setCurrentTurn] = useState<PlayerSymbol>('X');
  const [winner, setWinner] = useState<PlayerSymbol | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  
  // Players
  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2'); // Or AI
  
  // Online Specific
  const [roomCode, setRoomCode] = useState('');
  const [mySymbol, setMySymbol] = useState<PlayerSymbol | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Scores
  const [score, setScore] = useState({ X: 0, O: 0, Draws: 0 });

  // Refs for cleanup
  const unsubscribeRoomRef = useRef<(() => void) | null>(null);

  // --- Effects ---

  // Load settings
  useEffect(() => {
    const savedDiff = localStorage.getItem('difficulty');
    const savedSound = localStorage.getItem('soundEnabled');
    if (savedDiff) setDifficulty(savedDiff as Difficulty);
    if (savedSound) setSoundEnabled(savedSound === 'true');
  }, []);

  // Check Win/Draw
  const checkGameStatus = useCallback((currentBoard: CellValue[]) => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], line: combo };
      }
    }
    if (!currentBoard.includes(null)) return { winner: 'draw', line: null };
    return null;
  }, []);

  // AI Turn Handling
  useEffect(() => {
    if (gameMode === 'SINGLE' && currentTurn === 'O' && !winner && view === 'GAME') {
      const timer = setTimeout(() => {
        const aiMove = getBestMove(board, difficulty);
        if (aiMove !== -1) {
          handleMove(aiMove);
        }
      }, 600); // Thinking delay
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, gameMode, winner, view, board]);

  // Online Room Subscription
  useEffect(() => {
    if (gameMode === 'ONLINE' && roomCode) {
      unsubscribeRoomRef.current = subscribeToRoom(roomCode, (data: RoomData) => {
        // Sync Board & Turn
        setBoard(data.board || EMPTY_BOARD);
        setCurrentTurn(data.currentTurn);
        
        // Check for player connection status
        const isP1 = mySymbol === 'X';
        const opponent = isP1 ? data.players.player2 : data.players.player1;
        setOpponentConnected(opponent.joined);

        // Sync Winner
        if (data.winner) {
           setWinner(data.winner as any);
           if (data.winner !== 'draw') {
              // Recalculate line locally for visual
              const res = checkGameStatus(data.board || EMPTY_BOARD);
              if (res) setWinningLine(res.line);
           }
        } else {
            setWinner(null);
            setWinningLine(null);
        }

        // Auto-start game if waiting in lobby and opponent joins
        if (view === 'LOBBY' && data.players.player2.joined) {
           // Transition to game
           setTimeout(() => setView('GAME'), 1000);
        }
        
        // Handle opponent disconnect during game
        if (view === 'GAME' && !opponent.joined && !data.winner) {
            setErrorMsg("Opponent disconnected");
        } else {
            setErrorMsg("");
        }
      });
    }

    return () => {
      if (unsubscribeRoomRef.current) unsubscribeRoomRef.current();
    };
  }, [gameMode, roomCode, mySymbol, view, checkGameStatus]);

  // End Game Sound & Score Update
  useEffect(() => {
    if (winner) {
      if (winner === 'draw') {
        if(soundEnabled) playSound('draw');
        setScore(s => ({ ...s, Draws: s.Draws + 1 }));
      } else {
        if(soundEnabled) playSound('win');
        setScore(s => ({ ...s, [winner]: s[winner] + 1 }));
      }
    }
  }, [winner, soundEnabled]);


  // --- Actions ---

  const handleSoundToggle = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('soundEnabled', String(newState));
    playSound('click');
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    localStorage.setItem('difficulty', diff);
    playSound('click');
  };

  const startGame = (mode: GameMode) => {
    playSound('click');
    setGameMode(mode);
    setScore({ X: 0, O: 0, Draws: 0 });
    
    if (mode === 'SINGLE') {
      setPlayer1Name("You");
      setPlayer2Name(`AI (${difficulty})`);
      resetBoard();
      setMySymbol('X'); // Player is always X in single player for simplicity here
      setView('GAME');
    } else if (mode === 'LOCAL') {
      setView('MODE_SELECT'); // Goes to sub-options for local setup if needed, but per spec:
      // Spec says "Two Player" -> Sub Option. 
      // Let's assume user clicked "Two Player" on landing.
    } else {
      // ONLINE
    }
  };

  const resetBoard = () => {
    setBoard(EMPTY_BOARD);
    setCurrentTurn('X');
    setWinner(null);
    setWinningLine(null);
  };

  const handleMove = async (index: number) => {
    if (board[index] || winner) return;

    // Enforce Turn for Online
    if (gameMode === 'ONLINE') {
        if (currentTurn !== mySymbol) return;
        if (!opponentConnected) return; 
    }

    if (soundEnabled) playSound('move');

    const newBoard = [...board];
    newBoard[index] = currentTurn;
    
    // Local Optimistic Update (will be overwritten by DB in online, but feels snappier)
    setBoard(newBoard);

    // Check Win
    const result = checkGameStatus(newBoard);
    const nextTurn = currentTurn === 'X' ? 'O' : 'X';
    
    if (result) {
        setWinner(result.winner as PlayerSymbol | 'draw');
        setWinningLine(result.line);
        if (gameMode === 'ONLINE') {
            await updateGameState(roomCode, newBoard, nextTurn, result.winner as any);
        }
    } else {
        setCurrentTurn(nextTurn);
        if (gameMode === 'ONLINE') {
            await updateGameState(roomCode, newBoard, nextTurn, null);
        }
    }
  };

  const handleCreateRoom = async () => {
    setIsProcessing(true);
    try {
      const code = await createRoom(player1Name || 'Player 1');
      setRoomCode(code);
      setMySymbol('X');
      setPlayer2Name("Waiting...");
      setView('LOBBY');
    } catch (e) {
      alert("Error creating room. Check connection.");
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleJoinRoom = async () => {
    if (!roomCode || roomCode.length !== 4) {
        setErrorMsg("Invalid Code");
        return;
    }
    setIsProcessing(true);
    try {
        const success = await joinRoom(roomCode, player1Name || 'Player 2');
        if (success) {
            setMySymbol('O');
            setView('GAME'); // Should wait for sync, but view switch is fine
        } else {
            setErrorMsg("Room not found or full");
        }
    } catch (e) {
        setErrorMsg("Connection error");
    }
    setIsProcessing(false);
  };

  const handlePlayAgain = async () => {
      playSound('click');
      resetBoard();
      if (gameMode === 'ONLINE') {
          // In a real app, we'd need a handshake "request restart". 
          // For simplicity, whoever clicks play again resets the board for both.
          await updateGameState(roomCode, EMPTY_BOARD, 'X', null);
      }
  };

  const goBack = () => {
      playSound('click');
      if (view === 'GAME' || view === 'LOBBY') {
          if (gameMode === 'ONLINE') {
              leaveRoom(roomCode, mySymbol === 'X');
          }
      }
      setView('LANDING');
      setRoomCode('');
      setBoard(EMPTY_BOARD);
      setWinner(null);
  };

  // --- Render Helpers ---

  const renderStatus = () => {
      if (winner) {
          if (winner === 'draw') return <span className="text-gray-300">It's a Draw!</span>;
          const wName = winner === 'X' ? player1Name : player2Name;
          return <span className="text-accent drop-shadow-md">{wName} Wins!</span>;
      }
      if (gameMode === 'ONLINE' && !opponentConnected && view === 'GAME') {
          return <span className="text-red-400 animate-pulse">Opponent Disconnected</span>;
      }
      if (gameMode === 'ONLINE' && currentTurn !== mySymbol) {
          return <span className="text-gray-400 animate-pulse">Waiting for opponent...</span>;
      }
      const pName = currentTurn === 'X' ? player1Name : player2Name;
      return <span className="text-white">{pName}'s Turn ({currentTurn})</span>;
  };

  // --- Views ---

  if (view === 'LANDING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4 cursor-pointer p-2 rounded-full hover:bg-white/10" onClick={handleSoundToggle}>
             {soundEnabled ? <Volume2Icon className="text-accent" /> : <VolumeXIcon className="text-gray-400" />}
        </div>

        <div className="text-center mb-12 animate-scale-in">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2 drop-shadow-lg">Tic Tac Toe</h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">By PlayLoop Studios</p>
        </div>

        <div className="w-full max-w-md space-y-4">
          <button onClick={() => { setView('MODE_SELECT'); setGameMode('SINGLE'); }} className="w-full glass-panel py-5 rounded-2xl flex items-center justify-center space-x-4 hover:bg-white/10 transition-all hover:scale-105 group">
            <UserIcon className="w-8 h-8 text-accent group-hover:text-white transition-colors" />
            <span className="text-xl font-semibold">Single Player</span>
          </button>
          
          <button onClick={() => setView('ONLINE_MENU')} className="w-full glass-panel py-5 rounded-2xl flex items-center justify-center space-x-4 hover:bg-white/10 transition-all hover:scale-105 group">
            <UsersIcon className="w-8 h-8 text-cyan-400 group-hover:text-white transition-colors" />
            <span className="text-xl font-semibold">Two Player</span>
          </button>
        </div>
        
        <p className="mt-8 text-xs text-gray-500">Choose your mode to begin</p>
      </div>
    );
  }

  if (view === 'MODE_SELECT' && gameMode === 'SINGLE') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
            <button onClick={() => setView('LANDING')} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10"><ArrowLeftIcon /></button>
            <h2 className="text-3xl font-bold mb-8">Select Difficulty</h2>
            <div className="space-y-4 w-full max-w-xs">
                {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(diff => (
                    <button 
                        key={diff}
                        onClick={() => { handleDifficultyChange(diff); startGame('SINGLE'); }}
                        className={`w-full py-4 rounded-xl border transition-all ${difficulty === diff ? 'bg-accent text-background border-accent font-bold' : 'glass-panel border-white/10 text-gray-300 hover:bg-white/10'}`}
                    >
                        {diff}
                    </button>
                ))}
            </div>
          </div>
      )
  }

  if (view === 'ONLINE_MENU') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
          <button onClick={() => setView('LANDING')} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10"><ArrowLeftIcon /></button>
          <h2 className="text-3xl font-bold mb-10">Two Player Mode</h2>
          
          <div className="w-full max-w-md space-y-6">
            {/* Local */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><UsersIcon className="w-5 h-5 text-accent"/> Same Device</h3>
                <div className="space-y-3">
                    <input value={player1Name} onChange={e => setPlayer1Name(e.target.value)} placeholder="Player 1 Name" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                    <input value={player2Name} onChange={e => setPlayer2Name(e.target.value)} placeholder="Player 2 Name" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                    <button onClick={() => { setGameMode('LOCAL'); startGame('LOCAL'); setView('GAME'); }} className="w-full bg-accent text-background font-bold py-3 rounded-lg hover:brightness-110 transition-all">Start Local Game</button>
                </div>
            </div>

            {/* Online */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><GlobeIcon className="w-5 h-5 text-cyan-400"/> Play Online</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setView('CREATE_ROOM'); setPlayer1Name("Player 1"); }} className="bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-lg transition-all">Create Room</button>
                    <button onClick={() => { setView('JOIN_ROOM'); setPlayer1Name("Player 2"); }} className="bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-lg transition-all">Join Room</button>
                </div>
            </div>
          </div>
        </div>
      )
  }

  if (view === 'CREATE_ROOM') {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
             <button onClick={() => setView('ONLINE_MENU')} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10"><ArrowLeftIcon /></button>
             <h2 className="text-2xl font-bold mb-6">Create Room</h2>
             <div className="glass-panel p-8 rounded-2xl w-full max-w-sm text-center">
                 <input value={player1Name} onChange={e => setPlayer1Name(e.target.value)} placeholder="Enter Your Name" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:border-accent text-center text-lg" />
                 <button disabled={isProcessing} onClick={handleCreateRoom} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all flex justify-center">
                     {isProcessing ? <RefreshCwIcon className="animate-spin" /> : "Generate Room Code"}
                 </button>
             </div>
        </div>
     );
  }

  if (view === 'JOIN_ROOM') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
            <button onClick={() => setView('ONLINE_MENU')} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10"><ArrowLeftIcon /></button>
            <h2 className="text-2xl font-bold mb-6">Join Room</h2>
             <div className="glass-panel p-8 rounded-2xl w-full max-w-sm text-center">
                 <input value={player1Name} onChange={e => setPlayer1Name(e.target.value)} placeholder="Enter Your Name" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-accent text-center text-lg" />
                 <input value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={4} placeholder="4-DIGIT CODE" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:border-accent text-center text-2xl tracking-widest uppercase font-mono" />
                 {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}
                 <button disabled={isProcessing} onClick={handleJoinRoom} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all flex justify-center">
                     {isProcessing ? <RefreshCwIcon className="animate-spin" /> : "Join Game"}
                 </button>
             </div>
        </div>
      );
  }

  if (view === 'LOBBY') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
              <div className="glass-panel p-10 rounded-3xl text-center w-full max-w-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-accent animate-pulse"></div>
                  <h3 className="text-gray-400 uppercase tracking-widest text-xs mb-2">Room Code</h3>
                  <div className="flex items-center justify-center gap-3 mb-8">
                      <span className="text-5xl font-mono font-bold text-white tracking-widest">{roomCode}</span>
                      <button onClick={() => navigator.clipboard.writeText(roomCode)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><CopyIcon className="text-accent" /></button>
                  </div>
                  <div className="flex flex-col gap-4 items-center">
                      <div className="flex items-center gap-3 w-full bg-white/5 p-3 rounded-lg">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="font-semibold">{player1Name} (You)</span>
                      </div>
                      <div className="flex items-center gap-3 w-full bg-white/5 p-3 rounded-lg opacity-50">
                          <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse"></div>
                          <span className="italic">Waiting for Player 2...</span>
                      </div>
                  </div>
                  <button onClick={goBack} className="mt-8 text-gray-400 hover:text-white underline text-sm">Cancel</button>
              </div>
          </div>
      );
  }

  // GAME VIEW
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
        {/* Header */}
        <div className="w-full max-w-md flex justify-between items-center mb-8">
            <button onClick={goBack} className="p-2 rounded-full hover:bg-white/10"><ArrowLeftIcon /></button>
            <div className="text-xl font-bold font-mono bg-black/20 px-4 py-1 rounded-full border border-white/5">
                {renderStatus()}
            </div>
            <button onClick={handleSoundToggle} className="p-2 rounded-full hover:bg-white/10">
                {soundEnabled ? <Volume2Icon className="text-accent"/> : <VolumeXIcon className="text-gray-500"/>}
            </button>
        </div>

        {/* Board */}
        <div className="w-full max-w-md aspect-square mb-8">
             <div className="grid grid-cols-3 gap-3 p-3 glass-panel rounded-2xl h-full">
                 {board.map((cell, idx) => (
                     <Square 
                        key={idx} 
                        value={cell} 
                        onClick={() => handleMove(idx)}
                        disabled={!!cell || !!winner || (gameMode === 'ONLINE' && currentTurn !== mySymbol) || (gameMode === 'SINGLE' && currentTurn === 'O')}
                        isWinningSquare={winningLine?.includes(idx) ?? false}
                     />
                 ))}
             </div>
        </div>

        {/* Score & Controls */}
        <div className="w-full max-w-md space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className={`p-3 rounded-xl border ${currentTurn === 'X' ? 'bg-white/10 border-accent' : 'bg-transparent border-white/5'}`}>
                    <div className="text-xs text-gray-400 uppercase">{player1Name} (X)</div>
                    <div className="text-2xl font-bold">{score.X}</div>
                </div>
                <div className="p-3 rounded-xl border border-white/5">
                    <div className="text-xs text-gray-400 uppercase">Draws</div>
                    <div className="text-2xl font-bold">{score.Draws}</div>
                </div>
                <div className={`p-3 rounded-xl border ${currentTurn === 'O' ? 'bg-white/10 border-white' : 'bg-transparent border-white/5'}`}>
                    <div className="text-xs text-gray-400 uppercase">{player2Name} (O)</div>
                    <div className="text-2xl font-bold">{score.O}</div>
                </div>
            </div>

            {winner && (
                <button 
                    onClick={handlePlayAgain}
                    className="w-full py-4 bg-accent text-background font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(46,204,113,0.4)] animate-pulse-slow hover:scale-[1.02] transition-transform"
                >
                    Play Again
                </button>
            )}
        </div>
    </div>
  );
}

export default App;
