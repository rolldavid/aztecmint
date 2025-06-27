'use client'
import { useState, useEffect, useMemo } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contracts/config";
import TwitterConnect from "../components/TwitterConnect";
import TwitterGreeting from "../components/TwitterGreeting";

interface NFT {
  tokenId: number;
  owner: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
  };
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  bio: string;
  profileImage: string;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, isPending, data: txHash } = useWriteContract();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [twitterUser, setTwitterUser] = useState<TwitterUser | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(false);

  // Check for Twitter callback on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('Twitter auth error:', error);
      return;
    }
    
    if (code && state) {
      // Handle OAuth callback
      const handleCallback = async () => {
        try {
          const response = await fetch(`/api/twitter/callback?code=${code}&state=${state}`);
          const data = await response.json();
          
          if (response.ok && data.success) {
            // Store Twitter data in localStorage
            const twitterData = {
              id: data.user.id,
              username: data.user.username,
              name: data.user.name,
              bio: data.user.bio,
              profileImage: data.user.profileImage,
            };
            localStorage.setItem('twitterUser', JSON.stringify(twitterData));
            setTwitterUser(twitterData);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.error('Twitter callback failed:', data.error);
          }
        } catch (err) {
          console.error('Failed to handle Twitter callback:', err);
        }
      };
      
      handleCallback();
    } else {
      // Check if Twitter data exists in localStorage on page load
      const storedTwitterData = localStorage.getItem('twitterUser');
      if (storedTwitterData) {
        try {
          const twitterData = JSON.parse(storedTwitterData);
          setTwitterUser(twitterData);
        } catch (err) {
          console.error('Failed to parse stored Twitter data:', err);
          localStorage.removeItem('twitterUser');
        }
      }
    }
  }, []);

  // Read total token count
  const { data: tokenCounter } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'tokenCounter',
  });

  // Fetch all NFTs
  const fetchAllNFTs = async () => {
    if (!tokenCounter) return;
    setLoading(true);
    const totalTokens = Number(tokenCounter);
    const nftPromises = [];
    for (let i = 0; i < totalTokens; i++) {
      nftPromises.push(fetchNFT(i));
    }
    try {
      const nftResults = await Promise.all(nftPromises);
      const validNFTs = nftResults.filter(nft => nft !== null) as NFT[];
      setNfts(validNFTs);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual NFT data
  const fetchNFT = async (tokenId: number): Promise<NFT | null> => {
    try {
      // Get owner
      const ownerResponse = await fetch(`/api/contract-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        }),
      });
      if (!ownerResponse.ok) return null;
      const ownerData = await ownerResponse.json();
      const owner = ownerData.data;
      // Get token URI
      const tokenURIResponse = await fetch(`/api/contract-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'tokenURI',
          args: [tokenId],
        }),
      });
      if (!tokenURIResponse.ok) return null;
      const tokenURIData = await tokenURIResponse.json();
      const tokenURI = tokenURIData.data;
      // Fetch metadata
      let metadata;
      if (tokenURI) {
        try {
          const metadataResponse = await fetch(tokenURI);
          if (metadataResponse.ok) {
            metadata = await metadataResponse.json();
          }
        } catch {}
      }
      return {
        tokenId,
        owner: owner || 'Unknown',
        metadata,
      };
    } catch {
      return null;
    }
  };

  // Load NFTs when token counter changes
  useEffect(() => {
    if (tokenCounter && Number(tokenCounter) > 0) {
      fetchAllNFTs();
    }
  }, [tokenCounter]);

  // Split NFTs into owned and others
  const ownedNFTs = useMemo(() => {
    if (!address) return [];
    return nfts.filter(nft => nft.owner.toLowerCase() === address.toLowerCase());
  }, [nfts, address]);

  // Handle Twitter user data
  const handleTwitterUserData = (user: TwitterUser) => {
    setTwitterUser(user);
  };

  // Handle Twitter disconnect
  const handleTwitterDisconnect = () => {
    setTwitterUser(null);
    localStorage.removeItem('twitterUser');
  };

  // Upload file to IPFS using our API route
  const uploadToIPFS = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload to IPFS');
    }
    const data = await response.json();
    return data.IpfsHash;
  };

  // Upload metadata to IPFS using our API route
  const uploadMetadataToIPFS = async (metadata: any) => {
    const response = await fetch('/api/upload-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload metadata to IPFS');
    }
    const data = await response.json();
    return data.IpfsHash;
  };

  // Handle file upload and mint
  const handleMint = async () => {
    if (!file || !address) return;
    setError(null);
    try {
      // 1. Upload image to IPFS
      const imageCid = await uploadToIPFS(file);
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageCid}`;
      // 2. Create metadata and upload to IPFS
      const metadata = {
        name: "My Unique NFT",
        description: "An NFT minted from an uploaded image.",
        image: imageUrl,
      };
      const metadataCid = await uploadMetadataToIPFS(metadata);
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;
      // 3. Mint NFT with wagmi
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'mintNFT',
        args: [address, metadataUrl],
      });
    } catch (err: any) {
      setError(err.message || "Minting failed");
    }
  };

  const handleTwitterLogin = async () => {
    setTwitterLoading(true);
    setError(null);

    try {
      // Get auth URL from our API
      const authResponse = await fetch('/api/twitter/auth');
      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.error || 'Failed to initialize Twitter auth');
      }

      // Redirect to Twitter OAuth
      window.location.href = authData.authUrl.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Twitter');
      setTwitterLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1400' }}>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#001F18]/20 pointer-events-none"></div>
      
      <div className="relative z-10 p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        {/* Top bar: Connect/Disconnect */}
        <div className="flex justify-between items-center mb-12">
          <div className="text-3xl font-bold" style={{ color: '#F2EEE1' }}>
            AztecMint
          </div>
          {isConnected ? (
            <div className="flex items-center gap-4">
              <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#D4FF28', color: '#1A1400' }}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105"
                style={{ backgroundColor: '#FF1A1A', color: '#F2EEE1' }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="px-8 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              style={{ 
                background: 'linear-gradient(135deg, #D4FF28 0%, #2BFAE9 100%)',
                color: '#1A1400'
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Twitter Integration Section */}
        <div className="mb-16 max-w-2xl mx-auto">
          {twitterUser ? (
            <TwitterGreeting user={twitterUser} onDisconnect={handleTwitterDisconnect} />
          ) : (
            <div className="p-8 rounded-2xl border-2" 
                 style={{ 
                   backgroundColor: '#001F18',
                   borderColor: '#1DA1F2',
                   boxShadow: '0 10px 30px rgba(29, 161, 242, 0.2)'
                 }}>
              <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#F2EEE1' }}>
                Connect Your Twitter
              </h2>
              <p className="text-center mb-6" style={{ color: '#2BFAE9' }}>
                Connect your Twitter account to personalize your experience
              </p>
              <TwitterConnect onUserData={handleTwitterUserData} onLogin={handleTwitterLogin} isLoading={twitterLoading} />
            </div>
          )}
        </div>

        {/* Mint Section (only if connected) */}
        {isConnected && (
          <div className="mb-16 p-8 rounded-2xl max-w-2xl mx-auto shadow-2xl border-2" 
               style={{ 
                 backgroundColor: '#001F18',
                 borderColor: '#D4FF28',
                 boxShadow: '0 20px 40px rgba(212, 255, 40, 0.2)'
               }}>
            <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#F2EEE1' }}>
              Mint New NFT
            </h2>
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFile(e.target.files?.[0] ? new File([e.target.files[0]], e.target.files[0].name) : null)}
                  className="w-full p-4 rounded-xl border-2 border-dashed transition-all duration-300"
                  style={{ 
                    borderColor: '#FF2DF4',
                    backgroundColor: 'rgba(255, 45, 244, 0.1)',
                    color: '#F2EEE1'
                  }}
                />
              </div>
              <button
                onClick={handleMint}
                disabled={!file || isPending}
                className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ 
                  background: isPending 
                    ? 'linear-gradient(135deg, #FF1A1A 0%, #FF2DF4 100%)'
                    : 'linear-gradient(135deg, #D4FF28 0%, #2BFAE9 100%)',
                  color: '#1A1400'
                }}
              >
                {isPending ? "Minting..." : "Mint NFT"}
              </button>
              {txHash && (
                <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#00122E', color: '#2BFAE9' }}>
                  Transaction: {" "}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                    style={{ color: '#D4FF28' }}
                  >
                    {txHash}
                  </a>
                </div>
              )}
              {error && (
                <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#FF1A1A', color: '#F2EEE1' }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Owned NFTs Section */}
        {isConnected && ownedNFTs.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#F2EEE1' }}>
              Your NFTs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {ownedNFTs.map((nft) => (
                <div key={nft.tokenId} className="group relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-500 hover:scale-105"
                     style={{ backgroundColor: '#001F18' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#D4FF28]/20 to-[#2BFAE9]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {nft.metadata?.image && (
                    <img 
                      src={nft.metadata.image} 
                      alt={nft.metadata.name}
                      className="w-full h-64 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-3" style={{ color: '#F2EEE1' }}>
                      {nft.metadata?.name || `NFT #${nft.tokenId}`}
                    </h3>
                    <p className="text-sm mb-4" style={{ color: '#2BFAE9' }}>
                      {nft.metadata?.description || 'No description'}
                    </p>
                    <div className="space-y-2">
                      <p className="text-xs" style={{ color: '#D4FF28' }}>
                        Token ID: {nft.tokenId}
                      </p>
                      <p className="text-xs" style={{ color: '#D4FF28' }}>
                        Owner: {nft.owner && typeof nft.owner === 'string' && nft.owner.length >= 10 
                          ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}`
                          : nft.owner || 'Unknown'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All NFTs Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold" style={{ color: '#F2EEE1' }}>
              All NFTs in Collection
            </h2>
            <div className="px-4 py-2 rounded-full text-sm font-medium" 
                 style={{ backgroundColor: '#00122E', color: '#2BFAE9' }}>
              Total: {tokenCounter ? Number(tokenCounter) : 0}
            </div>
          </div>
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4" 
                   style={{ borderColor: '#D4FF28', borderTopColor: 'transparent' }}></div>
              <p className="mt-4 text-lg" style={{ color: '#F2EEE1' }}>Loading NFTs...</p>
            </div>
          ) : nfts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {nfts.map((nft) => (
                <div key={nft.tokenId} className="group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                     style={{ backgroundColor: '#001F18' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF2DF4]/10 to-[#2BFAE9]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {nft.metadata?.image && (
                    <img 
                      src={nft.metadata.image} 
                      alt={nft.metadata.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#F2EEE1' }}>
                      {nft.metadata?.name || `NFT #${nft.tokenId}`}
                    </h3>
                    <p className="text-sm mb-3 line-clamp-2" style={{ color: '#2BFAE9' }}>
                      {nft.metadata?.description || 'No description'}
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs" style={{ color: '#D4FF28' }}>
                        Token ID: {nft.tokenId}
                      </p>
                      <p className="text-xs" style={{ color: '#D4FF28' }}>
                        Owner: {nft.owner && typeof nft.owner === 'string' && nft.owner.length >= 10 
                          ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}`
                          : nft.owner || 'Unknown'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-xl mb-2" style={{ color: '#F2EEE1' }}>No NFTs minted yet</p>
              <p className="text-lg" style={{ color: '#2BFAE9' }}>Be the first to mint one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
