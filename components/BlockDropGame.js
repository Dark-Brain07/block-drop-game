import { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Leaderboard from './Leaderboard';
import styles from '../styles/Game.module.css';

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
  const { walletAddress, connectWallet, submitScore, isConnecting } = useWeb3();
  
  const [board, setBoard] = useState(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)));
  const [currentPiece, setCurrentPiece] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const touchStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const createNewPiece = useCallback(() => {
    const idx = Math.floor(Math.random() * SHAPES.length);
    return { shape: SHAPES[idx], color: COLORS[idx] };
  }, []);

  const checkCollision = useCallback((piece, pos, testBoard = board) => {
    if (!piece) return true;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
          if (newY >= 0 && testBoard[newY][newX]) return true;
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
          if (boardY >= 0) newBoard[boardY][boardX] = currentPiece.color;
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
      setLevel(Math.floor((lines + linesCleared) / 10) + 1);
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

  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    if (gameOver || isPaused) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > 30) moveHorizontal(deltaX > 0 ? 1 : -1);
    } else {
      if (deltaY > 50) hardDrop();
      else if (deltaY < -30) rotatePiece();
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

  const handleSubmitScore = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first!');
      return;
    }
    if (score === 0) {
      alert('Play the game first!');
      return;
    }
    const username = prompt('Enter your username (max 20 characters):');
    if (!username || username.trim() === '') return;
    setSubmitting(true);
    try {
      const result = await submitScore(score, level, lines, username.trim());
      alert(`🎉 Score Submitted!\n\nTransaction: ${result.transactionHash.slice(0,10)}...${result.transactionHash.slice(-8)}\n\nView on Basescan:\nhttps://basescan.org/tx/${result.transactionHash}`);
    } catch (error) {
      alert(`Failed to submit score: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!currentPiece && !gameOver) startGame();
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
        case 'ArrowLeft': moveHorizontal(-1); break;
        case 'ArrowRight': moveHorizontal(1); break;
        case 'ArrowDown': moveDown(); break;
        case 'ArrowUp': rotatePiece(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
        case 'p': case 'P': setIsPaused(prev => !prev); break;
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
    <div className={styles.container}>
      <div className={styles.gameWrapper}>
        <h1 className={styles.title}>🎮 Block Drop</h1>
        <p className={styles.subtitle}>Web3 Puzzle Game on Base</p>
        
        <button 
          onClick={connectWallet}
          disabled={isConnecting}
          className={`${styles.connectBtn} ${walletAddress ? styles.connected : ''}`}
        >
          {isConnecting ? '🔄 Connecting...' : 
           walletAddress ? `🔗 ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : 
           '🔗 Connect Wallet'}
        </button>

        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>Score</div>
            <div className={styles.statValue}>{score.toLocaleString()}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>Lines</div>
            <div className={styles.statValue}>{lines}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>Level</div>
            <div className={styles.statValue}>{level}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <button onClick={() => setIsPaused(!isPaused)} disabled={gameOver}>
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button onClick={startGame}>🔄 New Game</button>
        </div>

        {walletAddress && (
          <div className={styles.web3Controls}>
            <button onClick={handleSubmitScore} disabled={submitting || score === 0}>
              {submitting ? '⏳ Submitting...' : '📤 Submit Score'}
            </button>
            <button onClick={() => setShowLeaderboard(true)}>
              🏆 Leaderboard
            </button>
          </div>
        )}

        <div 
          className={styles.boardContainer}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.board}>
            {displayBoard.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className={styles.cell}
                  style={{ backgroundColor: cell || '#1a1a2e' }}
                />
              ))
            )}
          </div>
        </div>

        {isMobile && (
          <div className={styles.mobileControls}>
            <button onClick={() => moveHorizontal(-1)}>←</button>
            <button onClick={rotatePiece}>↻</button>
            <button onClick={hardDrop}>↓↓</button>
            <button onClick={() => moveHorizontal(1)}>→</button>
          </div>
        )}

        {!isMobile && (
          <p className={styles.instructions}>
            Arrow Keys: Move/Rotate | Space: Hard Drop | P: Pause
          </p>
        )}

        {gameOver && (
          <div className={styles.gameOverModal}>
            <div className={styles.gameOverContent}>
              <h2>Game Over! 🎮</h2>
              <p className={styles.finalScore}>{score.toLocaleString()} points</p>
              <p>Lines: {lines} | Level: {level}</p>
              {walletAddress && score > 0 && (
                <button onClick={handleSubmitScore} disabled={submitting}>
                  {submitting ? '⏳ Submitting...' : '📤 Submit Score'}
                </button>
              )}
              <button onClick={startGame}>Play Again 🎯</button>
            </div>
          </div>
        )}

        {showLeaderboard && (
          <Leaderboard onClose={() => setShowLeaderboard(false)} />
        )}
      </div>
    </div>
  );
}
