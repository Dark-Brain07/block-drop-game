import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext();

// Your contract on Base
const CONTRACT_ADDRESS = '0xa6A74BDCD285Fc5b6634666D511333f47Ea7aBaf';
const CONTRACT_ABI = [
  "function submitScore(uint256 _score, uint256 _level, uint256 _lines, string memory _username) external",
  "function getTopScores(uint256 _count) external view returns (tuple(address player, uint256 score, uint256 level, uint256 lines, uint256 timestamp, string username)[])",
  "function getPlayerBestScore(address _player) external view returns (uint256)",
  "function getTotalScores() external view returns (uint256)"
];

export function Web3Provider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Initialize read-only provider
  useEffect(() => {
    const initReadProvider = async () => {
      try {
        const readProvider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
        const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
        setContract(readContract);
      } catch (err) {
        console.error('Failed to initialize read provider:', err);
      }
    };
    initReadProvider();
  }, []);

  // Connect Wallet
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask!');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const web3Signer = web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      
      // Check if on Base network
      const network = await web3Provider.getNetwork();
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
                chainName: 'Base',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org']
              }]
            });
          } else {
            throw switchError;
          }
        }
      }

      const writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer);
      
      setProvider(web3Provider);
      setSigner(web3Signer);
      setContract(writeContract);
      setWalletAddress(address);
      
      return address;
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Wallet
  const disconnectWallet = () => {
    setWalletAddress(null);
    setProvider(null);
    setSigner(null);
    const readProvider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
    setContract(readContract);
  };

  // Submit Score
  const submitScore = async (score, level, lines, username) => {
    if (!signer) {
      throw new Error('Please connect your wallet first');
    }

    try {
      const tx = await contract.submitScore(score, level, lines, username);
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.transactionHash };
    } catch (err) {
      console.error('Submit score error:', err);
      throw err;
    }
  };

  // Get Leaderboard
  const getLeaderboard = async (count = 10) => {
    try {
      const scores = await contract.getTopScores(count);
      return scores.map(s => ({
        player: s.player,
        score: s.score.toNumber(),
        level: s.level.toNumber(),
        lines: s.lines.toNumber(),
        timestamp: s.timestamp.toNumber(),
        username: s.username
      }));
    } catch (err) {
      console.error('Get leaderboard error:', err);
      throw err;
    }
  };

  // Get Total Scores
  const getTotalScores = async () => {
    try {
      const total = await contract.getTotalScores();
      return total.toNumber();
    } catch (err) {
      console.error('Get total scores error:', err);
      return 0;
    }
  };

  // Listen to account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (walletAddress && accounts[0] !== walletAddress) {
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [walletAddress]);

  const value = {
    walletAddress,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    submitScore,
    getLeaderboard,
    getTotalScores,
    contractAddress: CONTRACT_ADDRESS
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
}
