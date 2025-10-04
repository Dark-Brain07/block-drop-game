/**
 * Web3 Integration for Block Drop Game
 * Leaderboard Contract on Base Mainnet
 * Contract Address: 0xa6A74BDCD285Fc5b6634666D511333f47Ea7aBaf
 */

// LEADERBOARD SMART CONTRACT ADDRESS ON BASE
const CONTRACT_ADDRESS = '0xa6A74BDCD285Fc5b6634666D511333f47Ea7aBaf';

// Contract ABI (Application Binary Interface)
const CONTRACT_ABI = [
  "function submitScore(uint256 _score, uint256 _level, uint256 _lines, string memory _username) external",
  "function getTopScores(uint256 _count) external view returns (tuple(address player, uint256 score, uint256 level, uint256 lines, uint256 timestamp, string username)[])",
  "function getPlayerBestScore(address _player) external view returns (uint256)",
  "function getTotalScores() external view returns (uint256)",
  "function getPlayerScores(address _player) external view returns (tuple(address player, uint256 score, uint256 level, uint256 lines, uint256 timestamp, string username)[])",
  "function playerUsername(address) external view returns (string)"
];

/**
 * Connect to user's MetaMask wallet
 * @returns {Object} { provider, signer, address }
 */
async function connectWallet() {
  // Check if MetaMask is installed
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create provider and signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    // Check if on Base network (Chain ID: 8453)
    const network = await provider.getNetwork();
    if (network.chainId !== 8453) {
      console.log('Not on Base network, attempting to switch...');
      
      try {
        // Try to switch to Base network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 in hex
        });
      } catch (switchError) {
        // If Base network is not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        } else {
          throw switchError;
        }
      }
    }
    
    console.log('✅ Wallet connected:', address);
    return { provider, signer, address };
    
  } catch (error) {
    console.error('❌ Wallet connection error:', error);
    throw error;
  }
}

/**
 * Submit score to blockchain
 * @param {number} score - Player's score
 * @param {number} level - Level reached
 * @param {number} lines - Lines cleared
 * @param {string} username - Player's username (max 20 chars)
 * @returns {Object} { success, transactionHash?, error? }
 */
async function submitScoreToBlockchain(score, level, lines, username) {
  try {
    // Validate inputs
    if (score <= 0) throw new Error('Score must be greater than 0');
    if (!username || username.trim() === '') throw new Error('Username is required');
    if (username.length > 20) throw new Error('Username must be 20 characters or less');
    
    // Connect wallet
    const { signer } = await connectWallet();
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    console.log('📤 Submitting score to blockchain...');
    console.log('Score:', score, 'Level:', level, 'Lines:', lines, 'Username:', username);
    
    // Submit score transaction
    const tx = await contract.submitScore(score, level, lines, username.trim());
    
    console.log('⏳ Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log('✅ Score submitted successfully!');
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
    
  } catch (error) {
    console.error('❌ Score submission error:', error);
    
    // Parse error message for user-friendly display
    let errorMessage = error.message;
    if (error.message.includes('user rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (error.message.includes('insufficient funds')) {
      errorMessage = 'Insufficient ETH for gas fees';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get top scores from blockchain
 * @param {number} count - Number of top scores to retrieve (default: 10)
 * @returns {Array} Array of score objects
 */
async function getLeaderboard(count = 10) {
  try {
    // Create read-only provider (no wallet needed)
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    console.log(`📊 Fetching top ${count} scores...`);
    
    // Get top scores
    const scores = await contract.getTopScores(count);
    
    // Format the data
    const formattedScores = scores.map(score => ({
      player: score.player,
      score: score.score.toNumber(),
      level: score.level.toNumber(),
      lines: score.lines.toNumber(),
      timestamp: score.timestamp.toNumber(),
      username: score.username,
      date: new Date(score.timestamp.toNumber() * 1000).toLocaleDateString()
    }));
    
    console.log('✅ Leaderboard fetched:', formattedScores.length, 'scores');
    return formattedScores;
    
  } catch (error) {
    console.error('❌ Leaderboard fetch error:', error);
    return [];
  }
}

/**
 * Get player's best score
 * @param {string} playerAddress - Ethereum address of the player
 * @returns {number} Player's best score
 */
async function getPlayerBestScore(playerAddress) {
  try {
    if (!ethers.utils.isAddress(playerAddress)) {
      throw new Error('Invalid Ethereum address');
    }
    
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    console.log('📊 Fetching best score for:', playerAddress);
    
    const bestScore = await contract.getPlayerBestScore(playerAddress);
    const score = bestScore.toNumber();
    
    console.log('✅ Best score:', score);
    return score;
    
  } catch (error) {
    console.error('❌ Player stats error:', error);
    return 0;
  }
}

/**
 * Get all scores for a specific player
 * @param {string} playerAddress - Ethereum address of the player
 * @returns {Array} Array of player's score objects
 */
async function getPlayerScores(playerAddress) {
  try {
    if (!ethers.utils.isAddress(playerAddress)) {
      throw new Error('Invalid Ethereum address');
    }
    
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    console.log('📊 Fetching all scores for:', playerAddress);
    
    const scores = await contract.getPlayerScores(playerAddress);
    
    const formattedScores = scores.map(score => ({
      player: score.player,
      score: score.score.toNumber(),
      level: score.level.toNumber(),
      lines: score.lines.toNumber(),
      timestamp: score.timestamp.toNumber(),
      username: score.username,
      date: new Date(score.timestamp.toNumber() * 1000).toLocaleDateString()
    }));
    
    console.log('✅ Player scores fetched:', formattedScores.length, 'scores');
    return formattedScores;
    
  } catch (error) {
    console.error('❌ Player scores error:', error);
    return [];
  }
}

/**
 * Get total number of scores submitted
 * @returns {number} Total count of scores
 */
async function getTotalScores() {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const total = await contract.getTotalScores();
    const count = total.toNumber();
    
    console.log('✅ Total scores:', count);
    return count;
    
  } catch (error) {
    console.error('❌ Total scores error:', error);
    return 0;
  }
}

/**
 * Switch to Base network
 * Helper function to switch MetaMask to Base network
 */
async function switchToBase() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }], // 8453 in hex
    });
    console.log('✅ Switched to Base network');
  } catch (error) {
    // If Base is not added, add it
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2105',
            chainName: 'Base',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org']
          }]
        });
        console.log('✅ Base network added and switched');
      } catch (addError) {
        console.error('❌ Failed to add Base network:', addError);
        throw addError;
      }
    } else {
      console.error('❌ Failed to switch network:', error);
      throw error;
    }
  }
}

/**
 * Get contract info
 * @returns {Object} Contract information
 */
function getContractInfo() {
  return {
    address: CONTRACT_ADDRESS,
    network: 'Base Mainnet',
    chainId: 8453,
    explorer: `https://basescan.org/address/${CONTRACT_ADDRESS}`,
    name: 'BlockDropLeaderboard'
  };
}

// Export functions for use in your app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    connectWallet,
    submitScoreToBlockchain,
    getLeaderboard,
    getPlayerBestScore,
    getPlayerScores,
    getTotalScores,
    switchToBase,
    getContractInfo
  };
}

// Log contract info on load
console.log('📋 Block Drop Web3 Integration Loaded');
console.log('Contract Address:', CONTRACT_ADDRESS);
console.log('Network: Base Mainnet (Chain ID: 8453)');
console.log('Explorer:', `https://basescan.org/address/${CONTRACT_ADDRESS}`);
