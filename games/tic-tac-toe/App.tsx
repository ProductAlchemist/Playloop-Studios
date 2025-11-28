import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, Difficulty, PlayerSymbol, CellValue, GameStatus, RoomData } from './types';
import { WINNING_COMBINATIONS, EMPTY_BOARD } from './constants';
import { getBestMove } from './services/ai';
import { createRoom, joinRoom, subscribeToRoom, updateGameState, leaveRoom, incrementVisitorCount, getVisitorCount, incrementGamesPlayed, getGamesPlayed } from './services/firebase';
import { playSound } from './utils/sound';
import Square from './components/Square';
import { UserIcon, UsersIcon, GlobeIcon, CopyIcon, Volume2Icon, VolumeXIcon, ArrowLeftIcon, RefreshCwIcon, GitHubIcon, LinkedInIcon } from './components/Icons';

type View = 'LANDING' | 'MODE_SELECT' | 'ONLINE_MENU' | 'CREATE_ROOM' | 'JOIN_ROOM' | 'LOBBY' | 'GAME';

function App() {
  // --- State ---
  const [view, setViewState] = useState<View>('LANDING');
  const [gameMode, setGameModeState] = useState<GameMode>('SINGLE');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game State
  const [board, setBoardState] = useState<CellValue[]>(EMPTY_BOARD);
  const [currentTurn, setCurrentTurnState] = useState<PlayerSymbol>('X');
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

  // Counters
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [gamesPlayedCount, setGamesPlayedCount] = useState<number | null>(null);

  // Coming Soon Modal
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

  // Refs for cleanup and stale closure prevention
  const unsubscribeRoomRef = useRef<(() => void) | null>(null);
  const hasTransitionedToGameRef = useRef<boolean>(false);

  // FIX 3: Add refs to prevent stale closures in Firebase callbacks
  const viewRef = useRef<View>(view);
  const boardRef = useRef<CellValue[]>(board);
  const currentTurnRef = useRef<PlayerSymbol>(currentTurn);

  // Wrapped state setters with logging
  const setView = (newView: View | ((prev: View) => View)) => {
    const actualNewView = typeof newView === 'function' ? newView(view) : newView;
    console.log('🔄 VIEW CHANGE:', view, '→', actualNewView, '| Stack:', new Error().stack?.split('\n')[2]);
    setViewState(newView);
  };

  const setGameMode = (newMode: GameMode) => {
    console.log('🎮 GAME MODE CHANGE:', gameMode, '→', newMode);
    setGameModeState(newMode);
  };

  const setBoard = (newBoard: CellValue[] | ((prev: CellValue[]) => CellValue[])) => {
    const actualNewBoard = typeof newBoard === 'function' ? newBoard(board) : newBoard;
    console.log('📋 BOARD UPDATE:', board, '→', actualNewBoard);
    setBoardState(newBoard);
  };

  const setCurrentTurn = (newTurn: PlayerSymbol) => {
    console.log('👉 TURN CHANGE:', currentTurn, '→', newTurn);
    setCurrentTurnState(newTurn);
  };

  // --- Effects ---

  // Update refs on every render to prevent stale closures
  useEffect(() => {
    viewRef.current = view;
    boardRef.current = board;
    currentTurnRef.current = currentTurn;
  });

  // Log every render
  useEffect(() => {
    console.log('🔁 RENDER:', {
      view,
      gameMode,
      mySymbol,
      roomCode,
      opponentConnected,
      currentTurn,
      boardLength: board.filter(c => c !== null).length,
      winner
    });
  });

  // Load settings
  useEffect(() => {
    const savedDiff = localStorage.getItem('difficulty');
    const savedSound = localStorage.getItem('soundEnabled');
    if (savedDiff) setDifficulty(savedDiff as Difficulty);
    if (savedSound) setSoundEnabled(savedSound === 'true');
  }, []);

  // Counters - Load on mount
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
      console.log('🔥 Setting up Firebase subscription for room:', roomCode, 'My symbol:', mySymbol);

      unsubscribeRoomRef.current = subscribeToRoom(roomCode, (data: RoomData) => {
        console.log('📡 Firebase update received:', data);

        // FIX 1 & 2: Use functional setState for ALL state updates to prevent stale state issues
        setBoardState(prevBoard => {
          console.log('📋 Firebase board update - prev:', prevBoard, 'new:', data.board || EMPTY_BOARD);
          return data.board || EMPTY_BOARD;
        });

        setCurrentTurnState(prevTurn => {
          console.log('👉 Firebase turn update - prev:', prevTurn, 'new:', data.currentTurn);
          return data.currentTurn;
        });

        // Check for player connection status
        const isP1 = mySymbol === 'X';
        const opponent = isP1 ? data.players.player2 : data.players.player1;
        const me = isP1 ? data.players.player1 : data.players.player2;

        setOpponentConnected(opponent.joined);

        // Sync player names
        if (isP1) {
          setPlayer2Name(opponent.joined ? opponent.name : 'Waiting...');
        } else {
          setPlayer1Name(data.players.player1.name);
          setPlayer2Name(me.name);
        }

        // Sync Winner
        if (data.winner) {
           setWinner(data.winner as any);
           if (data.winner !== 'draw') {
              // Recalculate line locally for visual
              for (const combo of WINNING_COMBINATIONS) {
                const [a, b, c] = combo;
                if (data.board[a] && data.board[a] === data.board[b] && data.board[a] === data.board[c]) {
                  setWinningLine(combo);
                  break;
                }
              }
           } else {
              setWinningLine(null);
           }
        } else {
            setWinner(null);
            setWinningLine(null);
        }

        // FIX 4: CRITICAL - Do NOT call setView from Firebase callback during gameplay!
        // Auto-start game if waiting in lobby and opponent joins
        // Only transition once to avoid repeated calls
        // We use viewRef to check current view instead of closure value
        if (!hasTransitionedToGameRef.current && data.players.player2.joined) {
          console.log('🎮 Player 2 joined! Checking if we should transition to game...');
          // Only transition if we're still in LOBBY view
          // This check happens in the ref to avoid stale closure
          hasTransitionedToGameRef.current = true;
          setTimeout(() => {
            // Use the wrapper function to properly transition
            setView((currentView) => {
              console.log('🔄 Auto-transition check - current view:', currentView);
              if (currentView === 'LOBBY') {
                console.log('✅ Transitioning from LOBBY to GAME');
                return 'GAME';
              }
              console.log('⏭️ Skipping transition - not in LOBBY');
              return currentView;
            });
          }, 500);
        }

        // Handle opponent disconnect during game
        setErrorMsg(prevError => {
          // Don't override errors if game is already over
          if (data.winner) return "";
          if (!opponent.joined) return "Opponent disconnected";
          return "";
        });
      });
    }

    return () => {
      if (unsubscribeRoomRef.current) {
        console.log('🔌 Unsubscribing from room');
        unsubscribeRoomRef.current();
        unsubscribeRoomRef.current = null;
      }
    };
  }, [gameMode, roomCode, mySymbol]); // FIX 5: Minimal dependencies only

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

  const startGame = async (mode: GameMode) => {
    console.log('🎮 START GAME CALLED with mode:', mode);
    playSound('click');
    setGameMode(mode);
    setScore({ X: 0, O: 0, Draws: 0 });

    // Increment games played counter when game actually starts
    try {
      await incrementGamesPlayed();
      const count = await getGamesPlayed();
      setGamesPlayedCount(count);
    } catch (error) {
      console.error('Failed to increment games played:', error);
    }

    if (mode === 'SINGLE') {
      console.log('🤖 Starting SINGLE player mode');
      setPlayer1Name("You");
      setPlayer2Name(`AI (${difficulty})`);
      resetBoard();
      setMySymbol('X'); // Player is always X in single player for simplicity here
      setView('GAME');
    } else if (mode === 'LOCAL') {
      console.log('👥 Starting LOCAL multiplayer mode');
      setView('MODE_SELECT'); // Goes to sub-options for local setup if needed, but per spec:
      // Spec says "Two Player" -> Sub Option.
      // Let's assume user clicked "Two Player" on landing.
    } else {
      console.log('🌐 ONLINE mode - no immediate action');
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
        if (currentTurn !== mySymbol) {
          console.log('❌ Not your turn! Current:', currentTurn, 'Your symbol:', mySymbol);
          return;
        }
        if (!opponentConnected) {
          console.log('❌ Opponent not connected');
          return;
        }
    }

    if (soundEnabled) playSound('move');

    const newBoard = [...board];
    newBoard[index] = currentTurn;

    // Check Win
    const result = checkGameStatus(newBoard);
    const nextTurn = currentTurn === 'X' ? 'O' : 'X';

    console.log('🎯 Making move at index', index, 'Current turn:', currentTurn, 'Next turn:', nextTurn);

    if (gameMode === 'ONLINE') {
      // For online mode, ONLY update Firebase - let the listener update local state
      console.log('🔥 Updating Firebase with new move...');
      await updateGameState(roomCode, newBoard, nextTurn, result ? result.winner as any : null);
      console.log('✅ Firebase updated successfully');
    } else {
      // For local/single player, update state directly
      setBoard(newBoard);
      if (result) {
        setWinner(result.winner as PlayerSymbol | 'draw');
        setWinningLine(result.line);
      } else {
        setCurrentTurn(nextTurn);
      }
    }
  };

  const handleCreateRoom = async () => {
    setIsProcessing(true);
    try {
      const code = await createRoom(player1Name || 'Player 1');
      setRoomCode(code);
      setMySymbol('X');
      setGameMode('ONLINE'); // Set game mode to ONLINE
      setPlayer2Name("Waiting...");
      resetBoard(); // Reset the board
      hasTransitionedToGameRef.current = false; // Reset transition flag
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
    setErrorMsg(""); // Clear any previous errors
    try {
        const success = await joinRoom(roomCode, player1Name || 'Player 2');
        if (success) {
            setMySymbol('O');
            setGameMode('ONLINE'); // Set game mode to ONLINE
            resetBoard(); // Reset the board
            setView('GAME'); // Go directly to game view
        } else {
            setErrorMsg("Room not found or full");
        }
    } catch (e) {
        setErrorMsg("Connection error");
        console.error("Join room error:", e);
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
      console.log('⬅️ GO BACK CALLED! Current view:', view, 'Current mode:', gameMode);
      console.trace('GO BACK STACK TRACE');
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
        {/* Visitor Counter - Top Left */}
        {visitorCount !== null && (
          <div className="absolute top-4 left-4 glass-panel px-3 py-1.5 rounded-full text-xs text-gray-300">
            👥 {visitorCount.toLocaleString()} visitors
          </div>
        )}

        {/* Games Played Counter - Top Right */}
        {gamesPlayedCount !== null && (
          <div className="absolute top-4 right-4 glass-panel px-3 py-1.5 rounded-full text-xs text-gray-300">
            🎮 {gamesPlayedCount.toLocaleString()} games played
          </div>
        )}

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

        {/* Footer */}
        <div className="absolute bottom-4 text-center">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Built by ProductAlchemist</span>
            <a href="https://github.com/ProductAlchemist" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-accent transition-all">
              <GitHubIcon className="inline-block" />
            </a>
            <span className="text-gray-600">|</span>
            <a href="https://www.linkedin.com/in/kshitijkulkarni-productmanager/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-accent transition-all">
              <LinkedInIcon className="inline-block" />
            </a>
          </div>
        </div>
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
            {/* Footer */}
            <div className="absolute bottom-4 text-center">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Built by ProductAlchemist</span>
                <a href="https://github.com/ProductAlchemist" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-accent transition-all">
                  <GitHubIcon className="inline-block" />
                </a>
                <span className="text-gray-600">|</span>
                <a href="https://www.linkedin.com/in/kshitijkulkarni-productmanager/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-accent transition-all">
                  <LinkedInIcon className="inline-block" />
                </a>
              </div>
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
            {/* Local - KEEP THIS WORKING */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><UsersIcon className="w-5 h-5 text-accent"/> Same Device</h3>
                <div className="space-y-3">
                    <input value={player1Name} onChange={e => setPlayer1Name(e.target.value)} placeholder="Player 1 Name" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                    <input value={player2Name} onChange={e => setPlayer2Name(e.target.value)} placeholder="Player 2 Name" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                    <button onClick={() => { setGameMode('LOCAL'); startGame('LOCAL'); setView('GAME'); }} className="w-full bg-accent text-background font-bold py-3 rounded-lg hover:brightness-110 transition-all">Start Local Game</button>
                </div>
            </div>

            {/* Online - SHOW COMING SOON MODAL */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><GlobeIcon className="w-5 h-5 text-cyan-400"/> Play Online</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setShowComingSoonModal(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-lg transition-all">Create Room</button>
                    <button onClick={() => setShowComingSoonModal(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-lg transition-all">Join Room</button>
                </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-4 text-center">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Built by ProductAlchemist</span>
              <a href="https://github.com/ProductAlchemist" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-accent transition-all">
                <GitHubIcon className="inline-block" />
              </a>
              <span className="text-gray-600">|</span>
              <a href="https://www.linkedin.com/in/kshitijkulkarni-productmanager/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-accent transition-all">
                <LinkedInIcon className="inline-block" />
              </a>
            </div>
          </div>

          {/* Coming Soon Modal */}
          {showComingSoonModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setShowComingSoonModal(false)}>
              <div className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="text-5xl mb-4">🚀</div>
                <h3 className="text-2xl font-bold mb-3">Online Multiplayer Coming Soon!</h3>
                <p className="text-gray-400 mb-6">We're working on it. Stay tuned!</p>
                <button onClick={() => setShowComingSoonModal(false)} className="w-full bg-accent text-background font-bold py-3 rounded-lg hover:brightness-110 transition-all">
                  Can't wait!
                </button>
              </div>
            </div>
          )}
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
  if (view === 'GAME') {
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
                        onClick={() => {
                          console.log('🖱️ SQUARE CLICKED:', idx, 'Current view:', view, 'Game mode:', gameMode);
                          handleMove(idx);
                        }}
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

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <span>Built by ProductAlchemist</span>
            <a href="https://github.com/ProductAlchemist" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-accent transition-all">
              <GitHubIcon className="inline-block" />
            </a>
            <span className="text-gray-600">|</span>
            <a href="https://www.linkedin.com/in/kshitijkulkarni-productmanager/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 hover:text-accent transition-all">
              <LinkedInIcon className="inline-block" />
            </a>
          </div>
        </div>
    </div>
    );
  }

  // Fallback for unexpected view states
  console.error('🚨 CRITICAL: Unknown view state:', view);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-panel p-8 rounded-2xl text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Error: Unknown View State</h2>
        <p className="text-gray-300 mb-4">View: {view}</p>
        <button onClick={() => setView('LANDING')} className="px-6 py-3 bg-accent text-background rounded-lg font-bold">
          Return to Home
        </button>
      </div>
    </div>
  );
}

export default App;
