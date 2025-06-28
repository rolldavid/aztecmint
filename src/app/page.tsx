'use client'
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contracts/config";
import Image from "next/image";

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
    const twitterSuccess = urlParams.get('twitter_success');
    const twitterUser = urlParams.get('twitter_user');
    const twitterError = urlParams.get('twitter_error');
    
    if (twitterError) {
      console.error('Twitter auth error:', twitterError);
      setError(`Twitter authentication failed: ${twitterError}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (twitterSuccess && twitterUser) {
      try {
        const userData = JSON.parse(twitterUser);
        // Store Twitter data in localStorage
        localStorage.setItem('twitterUser', JSON.stringify(userData));
        setTwitterUser(userData);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('Failed to parse Twitter user data:', err);
        setError('Failed to process Twitter user data');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }
    
    if (error) {
      console.error('Twitter auth error:', error);
      setError('Twitter authorization was denied');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
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
            setError(data.error || 'Twitter authentication failed');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error('Failed to handle Twitter callback:', err);
          setError('Failed to complete Twitter authentication');
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
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

  // Fetch individual NFT data
  const fetchNFT = useCallback(async (tokenId: number): Promise<NFT | null> => {
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
  }, []);

  // Fetch all NFTs
  const fetchAllNFTs = useCallback(async () => {
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
  }, [tokenCounter, fetchNFT]);

  // Load NFTs when token counter changes
  useEffect(() => {
    if (tokenCounter && Number(tokenCounter) > 0) {
      fetchAllNFTs();
    }
  }, [tokenCounter, fetchAllNFTs]);

  // Split NFTs into owned and others
  const ownedNFTs = useMemo(() => {
    if (!address) return [];
    return nfts.filter(nft => nft.owner.toLowerCase() === address.toLowerCase());
  }, [nfts, address]);

  // Handle Twitter disconnect
  const handleTwitterDisconnect = () => {
    setTwitterUser(null);
    localStorage.removeItem('twitterUser');
  };

  // Handle minting Twitter profile as NFT
  const handleMint = async () => {
    if (!twitterUser || !address) return;
    setError(null);
    try {
      // 1. Use Twitter profile image directly
      const imageUrl = twitterUser.profileImage;
      
      // 2. Create metadata and upload to IPFS
      const firstName = twitterUser.name?.split(' ')[0] || 'Anonymous';
      const metadata = {
        name: `${firstName}'s Profile Card`,
        description: `A personalized NFT card for ${twitterUser.name} (@${twitterUser.username}). ${twitterUser.bio || ''}`,
        image: imageUrl,
        attributes: [
          {
            trait_type: "Twitter Username",
            value: twitterUser.username
          },
          {
            trait_type: "Twitter Bio",
            value: twitterUser.bio || "No bio"
          }
        ]
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Minting failed");
    }
  };

  // Upload metadata to IPFS using our API route
  const uploadMetadataToIPFS = async (metadata: Record<string, unknown>) => {
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

        {/* Create Card Section */}
        <div className="mb-16 max-w-2xl mx-auto">
          {twitterUser ? (
            <div className="p-8 rounded-2xl border-2" 
                 style={{ 
                   backgroundColor: '#001F18',
                   borderColor: '#D4FF28',
                   boxShadow: '0 10px 30px rgba(212, 255, 40, 0.2)'
                 }}>
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4" 
                     style={{ borderColor: '#2BFAE9' }}>
                  <Image 
                    src={twitterUser.profileImage} 
                    alt={twitterUser.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#F2EEE1' }}>
                  Welcome, {twitterUser.name}!
                </h2>
                <p className="text-sm" style={{ color: '#2BFAE9' }}>
                  @{twitterUser.username}
                </p>
              </div>
              
              {/* Mint Profile as NFT Button */}
              <button
                onClick={handleMint}
                disabled={isPending}
                className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ 
                  background: isPending 
                    ? 'linear-gradient(135deg, #FF1A1A 0%, #FF2DF4 100%)'
                    : 'linear-gradient(135deg, #D4FF28 0%, #2BFAE9 100%)',
                  color: '#1A1400'
                }}
              >
                {isPending ? "Minting..." : "Mint Profile as NFT"}
              </button>
              
              {txHash && (
                <div className="text-sm p-3 rounded-lg mt-4" style={{ backgroundColor: '#00122E', color: '#2BFAE9' }}>
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
                <div className="text-sm p-3 rounded-lg mt-4" style={{ backgroundColor: '#FF1A1A', color: '#F2EEE1' }}>
                  {error}
                </div>
              )}
              
              <button
                onClick={handleTwitterDisconnect}
                className="w-full mt-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                style={{ backgroundColor: '#FF1A1A', color: '#F2EEE1' }}
              >
                Disconnect Twitter
              </button>
            </div>
          ) : (
            <div className="p-8 rounded-2xl border-2" 
                 style={{ 
                   backgroundColor: '#001F18',
                   borderColor: '#FF2DF4',
                   boxShadow: '0 10px 30px rgba(255, 45, 244, 0.2)'
                 }}>
              <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#F2EEE1' }}>
                Create Your Card
              </h2>
              <p className="text-center mb-6" style={{ color: '#2BFAE9' }}>
                Connect your Twitter to create a personalized NFT card
              </p>
              <button
                onClick={handleTwitterLogin}
                disabled={twitterLoading}
                className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ 
                  background: twitterLoading 
                    ? 'linear-gradient(135deg, #FF1A1A 0%, #FF2DF4 100%)'
                    : 'linear-gradient(135deg, #D4FF28 0%, #2BFAE9 100%)',
                  color: '#1A1400'
                }}
              >
                {twitterLoading ? "Connecting..." : "Create Card"}
              </button>
            </div>
          )}
        </div>

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
                    <div className="w-full h-64 relative overflow-hidden">
                      <Image 
                        src={nft.metadata.image} 
                        alt={nft.metadata.name}
                        fill
                        className="object-cover"
                      />
                    </div>
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
                    <div className="w-full h-48 relative overflow-hidden">
                      <Image 
                        src={nft.metadata.image} 
                        alt={nft.metadata.name}
                        fill
                        className="object-cover"
                      />
                    </div>
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
