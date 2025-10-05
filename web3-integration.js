console.log("web3-integration.js loaded");

async function connectWallet() {
  try {
    if (typeof ethers === "undefined") {
      throw new Error("Ethers.js not loaded properly.");
    }

    if (!window.ethereum) {
      alert("❌ MetaMask not detected. Please install it first.");
      return;
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const userAddress = accounts[0];

    // Create provider and signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Display connected wallet info
    const shortAddr = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    const connectBtn = document.getElementById("connectBtn");
    const status = document.getElementById("status");

    connectBtn.innerText = `✅ ${shortAddr}`;
    status.innerText = `Connected: ${shortAddr}`;

    console.log("Wallet connected:", userAddress);
    return { userAddress, provider, signer };
  } catch (error) {
    console.error("Wallet connection failed:", error);
    alert("⚠️ Wallet connection failed. Check console for details.");
  }
}

// Attach event listener once DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("connectBtn");
  connectBtn.addEventListener("click", connectWallet);
});
