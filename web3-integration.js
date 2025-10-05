/**
 * Block Drop Web3 Integration (Base Mainnet)
 */
if (typeof ethers === 'undefined') {
  throw new Error('Ethers.js not loaded — make sure the CDN script is included before this file.');
}

const CONTRACT_ADDRESS = '0xa6A74BDCD285Fc5b6634666D511333f47Ea7aBaf';
const CONTRACT_ABI = [
  "function submitScore(uint256,uint256,uint256,string)",
  "function getTopScores(uint256) view returns (tuple(address player,uint256 score,uint256 level,uint256 lines,uint256 timestamp,string username)[])"
];

async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found — install it first.');

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  const network = await provider.getNetwork();
  if (network.chainId !== 8453) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }]
      });
    } catch (err) {
      if (err.code === 4902) {
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
        throw err;
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
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
}

async function getLeaderboard(count = 10) {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const scores = await contract.getTopScores(count);
    return scores.map(s => ({
      player: s.player,
      score: Number(s.score),
      level: Number(s.level),
      lines: Number(s.lines),
      timestamp: Number(s.timestamp),
      username: s.username
    }));
  } catch (err) {
    console.error('Leaderboard error:', err);
    return [];
  }
}

console.log('✅ Web3 Integration Loaded (Base Mainnet)');
