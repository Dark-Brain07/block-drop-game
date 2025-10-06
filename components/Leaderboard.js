import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import styles from '../styles/Leaderboard.module.css';

export default function Leaderboard({ onClose }) {
  const { getLeaderboard } = useWeb3();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard(20);
      setScores(data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  return (
    <div className={styles.modal}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2>🏆 Global Leaderboard</h2>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Scores</span>
            <span className={styles.statValue}>{scores.length}</span>
          </div>
        </div>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading leaderboard...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={loadLeaderboard} className={styles.retryBtn}>
              🔄 Retry
            </button>
          </div>
        )}

        {!loading && !error && scores.length === 0 && (
          <div className={styles.empty}>
            <p>🎯 No scores yet!</p>
            <p>Be the first to submit a score!</p>
          </div>
        )}

        {!loading && !error && scores.length > 0 && (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span className={styles.rank}>Rank</span>
              <span className={styles.player}>Player</span>
              <span className={styles.score}>Score</span>
              <span className={styles.details}>Details</span>
            </div>
            
            <div className={styles.tableBody}>
              {scores.map((entry, index) => (
                <div key={index} className={`${styles.row} ${index < 3 ? styles.topThree : ''}`}>
                  <span className={styles.rank}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                  </span>
                  <span className={styles.player}>
                    <div className={styles.playerName}>
                      {entry.username || 'Anonymous'}
                    </div>
                    <div className={styles.playerAddress}>
                      {entry.player.slice(0, 6)}...{entry.player.slice(-4)}
                    </div>
                  </span>
                  <span className={styles.score}>
                    {entry.score.toLocaleString()}
                  </span>
                  <span className={styles.details}>
                    <div>Level {entry.level}</div>
                    <div>{entry.lines} lines</div>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <button onClick={loadLeaderboard} className={styles.refreshBtn} disabled={loading}>
            🔄 Refresh
          </button>
          <button onClick={onClose} className={styles.backBtn}>
            ← Back to Game
          </button>
        </div>
      </div>
    </div>
  );
}
