/**
 * Block Drop Web3 Integration — Base Mainnet
 */
const CONTRACT_ADDRESS = '0xa6A74BDCD285Fc5b6634666D511333f47Ea7aBaf';
const CONTRACT_ABI = [
  "function submitScore(uint256 _score, uint256 _level, uint256 _lines, string memory _username) external",
  "function getTopScores(uint256 _count) external view returns (tuple(address player, uint256 score, uint256 level, uint256 lines, uint256 timestamp, string username)[])"
];

async function connectWallet() {
  if (typeof window.ethereum === 'undefined')
    throw new Error('Please install MetaMask!');

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  const network = await provider.getNetwork();
  if (network.chainId !== 8453) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2105',
            chainName: 'Base Mainnet',
            nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
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
}

async function submitScoreToBlockchain(score, level, lines, username) {
  try {
    const { signer } = await connectWallet();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    const tx = await contract.submitScore(score, level, lines, username.trim());
    await tx.wait();
    return { success: true, transactionHash: tx.hash };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getLeaderboard(count = 10) {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const scores = await contract.getTopScores(count);
    return scores.map(s => ({
      player: s.player,
      score: s.score.toNumber(),
      level: s.level.toNumber(),
      lines: s.lines.toNumber(),
      timestamp: s.timestamp.toNumber(),
      username: s.username
    }));
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return [];
  }
}

console.log('✅ Web3 Integration Loaded (Base Mainnet)');
console.log('Contract:', CONTRACT_ADDRESS);
