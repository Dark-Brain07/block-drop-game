// Replace this with YOUR actual contract address from Remix
const CONTRACT_ADDRESS = '0x0xa6A74BDCD285Fc5b6634666D511333f47Ea7aBaf';

const CONTRACT_ABI = [
  "function submitScore(uint256 _score, uint256 _level, uint256 _lines, string memory _username) external",
  "function getTopScores(uint256 _count) external view returns (tuple(address player, uint256 score, uint256 level, uint256 lines, uint256 timestamp, string username)[])",
  "function getPlayerBestScore(address _player) external view returns (uint256)",
  "function getTotalScores() external view returns (uint256)"
];

// Connect wallet function
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Please install MetaMask!');
  }

  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    // Check if on Base network (Chain ID: 8453)
    const network = await provider.getNetwork();
    if (network.chainId !== 8453) {
      // Try to switch to Base
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 in hex
        });
      } catch (switchError) {
        // If Base is not added, add it
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
    
    return { provider, signer, address };
  } catch (error) {
    console.error('Wallet connection error:', error);
    throw error;
  }
}

// Submit score to blockchain
async function submitScoreToBlockchain(score, level, lines, username) {
  try {
    const { signer } = await connectWallet();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    console.log('Submitting score to blockchain...');
    const tx = await contract.submitScore(score, level, lines, username);
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    console.log('Score submitted successfully!');
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Score submission error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get leaderboard from blockchain
async function getLeaderboard(count = 10) {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const scores = await contract.getTopScores(count);
    
    return scores.map(score => ({
      player: score.player,
      score: score.score.toNumber(),
      level: score.level.toNumber(),
      lines: score.lines.toNumber(),
      timestamp: score.timestamp.toNumber(),
      username: score.username
    }));
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return [];
  }
}

// Get player's best score
async function getPlayerBestScore(playerAddress) {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const bestScore = await contract.getPlayerBestScore(playerAddress);
    return bestScore.toNumber();
  } catch (error) {
    console.error('Player stats error:', error);
    return 0;
  }
}

// Get total number of scores
async function getTotalScores() {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const total = await contract.getTotalScores();
    return total.toNumber();
  } catch (error) {
    console.error('Total scores error:', error);
    return 0;
  }
}
