import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { NFTStorage, File } from "nft.storage";
import { ethers } from "ethers";

// Replace with your contract address and ABI
const CONTRACT_ADDRESS = "0xYourContractAddress";
const CONTRACT_ABI = [
  // Minimal ERC721 + mintNFT(address, string) ABI
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "string", "name": "tokenURI", "type": "string" }
    ],
    "name": "mintNFT",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
const NFT_STORAGE_TOKEN = "a9a9e804.3f50c032adf747b6a9d5afcb1bc592a8"; // Get from https://nft.storage/

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [file, setFile] = useState<File | null>(null);
  const [minting, setMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload and mint
  const handleMint = async () => {
    if (!file || !address) return;
    setMinting(true);
    setError(null);
    try {
      // 1. Upload image to IPFS
      const client = new NFTStorage({ token: NFT_STORAGE_TOKEN });
      const imageCid = await client.storeBlob(file);
      const imageUrl = `https://ipfs.io/ipfs/${imageCid}`;

      // 2. Create metadata and upload to IPFS
      const metadata = {
        name: "My Unique NFT",
        description: "An NFT minted from an uploaded image.",
        image: imageUrl,
      };
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
      const metadataCid = await client.storeBlob(metadataBlob);
      const metadataUrl = `https://ipfs.io/ipfs/${metadataCid}`;

      // 3. Mint NFT with ethers.js
      if (!(window as any).ethereum) throw new Error("MetaMask not found");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mintNFT(address, metadataUrl);
      setTxHash(tx.hash);
      await tx.wait();
    } catch (err: any) {
      setError(err.message || "Minting failed");
    }
    setMinting(false);
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {!isConnected ? (
        <button
          onClick={() => connect({ connector: connectors[0] })}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <div>Connected: {address}</div>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Disconnect
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files?.[0] ? new File([e.target.files[0]], e.target.files[0].name) : null)}
          />
          <button
            onClick={handleMint}
            disabled={!file || minting}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            {minting ? "Minting..." : "Mint NFT"}
          </button>
          {txHash && (
            <div className="text-sm text-gray-500 mt-4">
              Transaction: {" "}
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                {txHash}
              </a>
            </div>
          )}
          {error && <div className="text-red-500 mt-4">{error}</div>}
        </div>
      )}
    </div>
  );
}
