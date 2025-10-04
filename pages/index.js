import React, { useState, useEffect, useCallback } from 'react';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 25;

const SHAPES = [
  [[1,1,1,1]], // I
  [[1,1],[1,1]], // O
  [[1,1,1],[0,1,0]], // T
  [[1,1,1],[1,0,0]], // L
  [[1,1,1],[0,0,1]], // J
  [[1,1,0],[0,1,1]], // S
  [[0,1,1],[1,1,0]]  // Z
];

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

export default function BlockDropGame() {
  const [board, setBoard] = useState(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)));
  const [currentPiece, setCurrentPiece] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');

  const createNewPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    return {
      shape: SHAPES[shapeIndex],
      color: COLORS[shapeIndex]
    };
  }, []);

  const checkCollision = useCallback((piece, pos, testBoard = board) => {
    if (!piece) return true;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          if (newY >= 0 && testBoard[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }, [board]);

  const mergePiece = useCallback(() => {
    const newBoard = board.map(row => [...row]);
    
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const boardY = position.y + y;
          const boardX = position.x + x;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = currentPiece.color;
          }
        }
      });
    });
    
    return newBoard;
  }, [board, currentPiece, position]);

  const clearLines = useCallback((testBoard) => {
    let linesCleared = 0;
    const newBoard = testBoard.filter(row => {
      if (row.every(cell => cell !== 0)) {
        linesCleared++;
        return false;
      }
      return true;
    });
    
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    
    return { newBoard, linesCleared };
  }, []);

  const rotatePiece = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return;
    
    const rotated = currentPiece.shape[0].map((_, i) =>
      currentPiece.shape.map(row => row[i]).reverse()
    );
    
    const rotatedPiece = { ...currentPiece, shape: rotated };
    
    if (!checkCollision(rotatedPiece, position)) {
      setCurrentPiece(rotatedPiece);
    }
  }, [currentPiece, position, checkCollision, isPaused, gameOver]);

  const moveDown = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return;
    
    const newPos = { x: position.x, y: position.y + 1 };
    
    if (!checkCollision(currentPiece, newPos)) {
      setPosition(newPos);
    } else {
      const mergedBoard = mergePiece();
      const { newBoard, linesCleared } = clearLines(mergedBoard);
      
      setBoard(newBoard);
      setLines(prev => prev + linesCleared);
      setScore(prev => prev + (linesCleared * 100 * level));
      setLevel(Math.floor(lines / 10) + 1);
      
      const newPiece = createNewPiece();
      const startPos = { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 };
      
      if (checkCollision(newPiece, startPos, newBoard)) {
        setGameOver(true);
      } else {
        setCurrentPiece(newPiece);
        setPosition(startPos);
      }
    }
  }, [currentPiece, position, checkCollision, mergePiece, clearLines, createNewPiece, isPaused, gameOver, level, lines]);

  const moveHorizontal = useCallback((direction) => {
    if (!currentPiece || isPaused || gameOver) return;
    
    const newPos = { x: position.x + direction, y: position.y };
    
    if (!checkCollision(currentPiece, newPos)) {
      setPosition(newPos);
    }
  }, [currentPiece, position, checkCollision, isPaused, gameOver]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return;
    
    let newY = position.y;
    while (!checkCollision(currentPiece, { x: position.x, y: newY + 1 })) {
      newY++;
    }
    setPosition({ x: position.x, y: newY });
    setTimeout(moveDown, 50);
  }, [currentPiece, position, checkCollision, moveDown, isPaused, gameOver]);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        alert('Wallet connected successfully! ✅');
      } catch (error) {
        console.error('Wallet connection error:', error);
        alert('Failed to connect wallet. Please try again.');
      }
    } else {
      alert('Please install MetaMask to connect your wallet and submit scores to blockchain!');
      window.open('https://metamask.io', '_blank');
    }
  };

  const startGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)));
    const newPiece = createNewPiece();
    setCurrentPiece(newPiece);
    setPosition({ x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 });
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
  };

  useEffect(() => {
    if (!currentPiece && !gameOver) {
      startGame();
    }
  }, []);

  useEffect(() => {
    if (gameOver || isPaused) return;
    
    const speed = Math.max(200, 1000 - (level - 1) * 100);
    const timer = setInterval(moveDown, speed);
    
    return () => clearInterval(timer);
  }, [moveDown, gameOver, isPaused, level]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameOver) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
          moveHorizontal(1);
          break;
        case 'ArrowDown':
          moveDown();
          break;
        case 'ArrowUp':
          rotatePiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'p':
        case 'P':
          setIsPaused(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [moveHorizontal, moveDown, rotatePiece, hardDrop, gameOver]);

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    if (currentPiece) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = position.y + y;
            const boardX = position.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color;
            }
          }
        });
      });
    }
    
    return displayBoard;
  };

  const displayBoard = renderBoard();

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #1a1a2e, #0f3460, #16213e)', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        background: 'rgba(0,0,0,0.3)', 
        backdropFilter: 'blur(10px)', 
        borderRadius: '20px', 
        padding: '30px', 
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h1 style={{ 
          fontSize: '42px', 
          fontWeight: 'bold', 
          color: 'white', 
          marginBottom: '20px', 
          textAlign: 'center',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>
          🎮 Block Drop
        </h1>
        
        <button 
          onClick={connectWallet}
          style={{ 
            width: '100%', 
            padding: '12px 20px', 
            marginBottom: '20px', 
            background: walletAddress ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '10px', 
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          {walletAddress 
            ? `🔗 Connected: ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` 
            : '🔗 Connect Wallet (Optional)'}
        </button>

        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          {/* Game Board */}
          <div style={{ 
            background: 'rgba(0,0,0,0.5)', 
            padding: '15px', 
            borderRadius: '10px', 
            border: '4px solid #333',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${BLOCK_SIZE}px)`,
              gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${BLOCK_SIZE}px)`,
              gap: 0
            }}>
              {displayBoard.map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    style={{
                      width: BLOCK_SIZE,
                      height: BLOCK_SIZE,
                      backgroundColor: cell || '#1a1a2e',
                      border: '1px solid #333',
                      boxShadow: cell ? 'inset 0 0 10px rgba(255,255,255,0.3)' : 'none',
                      transition: 'all 0.1s ease'
                    }}
                  />
                ))
              )}
            </div>
          </div>
          
          {/* Side Panel */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px',
            minWidth: '200px'
          }}>
            {/* Score */}
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              padding: '20px', 
              borderRadius: '12px', 
              color: 'white',
              boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Score</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{score}</div>
            </div>
            
            {/* Lines */}
            <div style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
              padding: '15px', 
              borderRadius: '12px', 
              color: 'white',
              boxShadow: '0 8px 20px rgba(240, 147, 251, 0.4)'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Lines</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{lines}</div>
            </div>
            
            {/* Level */}
            <div style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
              padding: '15px', 
              borderRadius: '12px', 
              color: 'white',
              boxShadow: '0 8px 20px rgba(79, 172, 254, 0.4)'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Level</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{level}</div>
            </div>
            
            {/* Controls Info */}
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '15px', 
              borderRadius: '12px', 
              color: 'white', 
              fontSize: '13px',
              lineHeight: '1.6'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>⌨️ Controls:</div>
              <div>← → : Move Left/Right</div>
              <div>↑ : Rotate Block</div>
              <div>↓ : Soft Drop</div>
              <div>Space : Hard Drop</div>
              <div>P : Pause Game</div>
            </div>
            
            {/* Pause Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              disabled={gameOver}
              style={{ 
                background: gameOver ? '#6b7280' : 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
                color: gameOver ? '#9ca3af' : '#000', 
                fontWeight: 'bold', 
                padding: '14px 20px', 
                borderRadius: '12px', 
                border: 'none', 
                cursor: gameOver ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                boxShadow: gameOver ? 'none' : '0 6px 20px rgba(251, 191, 36, 0.4)'
              }}
              onMouseOver={(e) => !gameOver && (e.target.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            
            {/* New Game Button */}
            <button
              onClick={startGame}
              style={{ 
                background: 'linear-gradient(135deg, #10b981, #059669)', 
                color: 'white', 
                fontWeight: 'bold', 
                padding: '14px 20px', 
                borderRadius: '12px', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🔄 New Game
            </button>
          </div>
        </div>
        
        {/* Game Over Modal */}
        {gameOver && (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.85)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 50,
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              padding: '50px 60px', 
              borderRadius: '24px', 
              color: 'white', 
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              animation: 'fadeIn 0.3s ease'
            }}>
              <h2 style={{ 
                fontSize: '48px', 
                fontWeight: 'bold', 
                marginBottom: '25px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}>
                Game Over! 🎮
              </h2>
              <p style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.95 }}>
                Final Score: <strong>{score}</strong>
              </p>
              <p style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.9 }}>
                Lines Cleared: <strong>{lines}</strong>
              </p>
              <p style={{ fontSize: '22px', marginBottom: '35px', opacity: 0.9 }}>
                Level Reached: <strong>{level}</strong>
              </p>
              <button
                onClick={startGame}
                style={{ 
                  background: 'white', 
                  color: '#667eea', 
                  fontWeight: 'bold', 
                  padding: '16px 50px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontSize: '18px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 6px 20px rgba(255,255,255,0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 8px 25px rgba(255,255,255,0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 6px 20px rgba(255,255,255,0.3)';
                }}
              >
                Play Again 🎯
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Touch Controls */}
      <div style={{ 
        marginTop: '25px', 
        display: 'flex', 
        gap: '12px', 
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => moveHorizontal(-1)}
          style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
            color: 'white', 
            fontWeight: 'bold', 
            padding: '18px 32px', 
            borderRadius: '12px', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '24px',
            minWidth: '70px',
            boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          ←
        </button>
        <button
          onClick={rotatePiece}
          style={{ 
            background: 'linear-gradient(135deg, #10b981, #059669)', 
            color: 'white', 
            fontWeight: 'bold', 
            padding: '18px 32px', 
            borderRadius: '12px', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '24px',
            minWidth: '70px',
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          ↻
        </button>
        <button
          onClick={hardDrop}
          style={{ 
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
            color: 'white', 
            fontWeight: 'bold', 
            padding: '18px 32px', 
            borderRadius: '12px', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '24px',
            minWidth: '70px',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          ↓↓
        </button>
        <button
          onClick={() => moveHorizontal(1)}
          style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
            color: 'white', 
            fontWeight: 'bold', 
            padding: '18px 32px', 
            borderRadius: '12px', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '24px',
            minWidth: '70px',
            boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          →
        </button>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '30px',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        <p>Built on Base • Deployed on Farcaster</p>
        {walletAddress && (
          <p style={{ marginTop: '5px', fontSize: '12px' }}>
            Ready to submit scores on-chain! 🎯
          </p>
        )}
      </div>
    </div>
  );
}
