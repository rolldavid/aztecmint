'use client'
import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useChainId } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contracts/config";
import Image from "next/image";
import html2canvas from 'html2canvas';

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
  const chainId = useChainId();

  const [error, setError] = useState<string | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [twitterUser, setTwitterUser] = useState<TwitterUser | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const cardBoundingRef = useRef<DOMRect | null>(null);
  const cardExportRef = useRef<HTMLDivElement | null>(null);
  const [nftMinted, setNftMinted] = useState(false);
  const [polymathDescription, setPolymathDescription] = useState<string | null>(null);
  const [descLoading, setDescLoading] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);
  const [pendingMint, setPendingMint] = useState(false);
  const [tokenCounter, setTokenCounter] = useState<number | undefined>(undefined);

  // Check if user is on Sepolia
  const isOnSepolia = chainId === 11155111;

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

  // Fetch tokenCounter from API route on mount
  useEffect(() => {
    const fetchTokenCounter = async () => {
      try {
        const response = await fetch('/api/contract-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'tokenCounter',
            args: [],
          }),
        });
        const data = await response.json();
        if (response.ok && data.data) {
          setTokenCounter(Number(data.data));
          console.log('Token counter (API):', Number(data.data));
        } else {
          setTokenCounter(undefined);
          setError(data.error || 'Failed to fetch token counter');
        }
      } catch (err) {
        setTokenCounter(undefined);
        setError('Failed to fetch token counter');
      }
    };
    fetchTokenCounter();
  }, []);

  // Fetch individual NFT data
  const fetchNFT = useCallback(async (tokenId: number): Promise<NFT | null> => {
    try {
      console.log(`Fetching NFT ${tokenId}...`);
      
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
      if (!ownerResponse.ok) {
        console.error(`Failed to get owner for token ${tokenId}:`, await ownerResponse.text());
        return null;
      }
      const ownerData = await ownerResponse.json();
      const owner = ownerData.data;
      console.log(`Token ${tokenId} owner:`, owner);
      
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
      if (!tokenURIResponse.ok) {
        console.error(`Failed to get token URI for token ${tokenId}:`, await tokenURIResponse.text());
        return null;
      }
      const tokenURIData = await tokenURIResponse.json();
      const tokenURI = tokenURIData.data;
      console.log(`Token ${tokenId} URI:`, tokenURI);
      
      // Fetch metadata
      let metadata;
      if (tokenURI) {
        try {
          const metadataResponse = await fetch(tokenURI);
          if (metadataResponse.ok) {
            metadata = await metadataResponse.json();
            console.log(`Token ${tokenId} metadata:`, metadata);
          } else {
            console.error(`Failed to fetch metadata for token ${tokenId}:`, metadataResponse.status);
          }
        } catch (err) {
          console.error(`Error fetching metadata for token ${tokenId}:`, err);
        }
      }
      
      const nft = {
        tokenId,
        owner: owner || 'Unknown',
        metadata,
      };
      console.log(`Successfully fetched NFT ${tokenId}:`, nft);
      return nft;
    } catch (err) {
      console.error(`Error fetching NFT ${tokenId}:`, err);
      return null;
    }
  }, []);

  // Fetch all NFTs
  const fetchAllNFTs = useCallback(async () => {
    if (!tokenCounter) {
      console.log('No token counter available, skipping NFT fetch');
      return;
    }
    console.log('Starting to fetch all NFTs, total tokens:', tokenCounter);
    setLoading(true);
    const totalTokens = Number(tokenCounter);
    const nftPromises = [];
    for (let i = 0; i < totalTokens; i++) {
      nftPromises.push(fetchNFT(i));
    }
    try {
      const nftResults = await Promise.all(nftPromises);
      console.log('All NFT fetch results:', nftResults);
      const validNFTs = nftResults.filter(nft => nft !== null) as NFT[];
      console.log('Valid NFTs:', validNFTs);
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

  console.log('Current NFTs state:', nfts);
  console.log('Current address:', address);

  // Handle Twitter disconnect
  const handleTwitterDisconnect = () => {
    setTwitterUser(null);
    localStorage.removeItem('twitterUser');
    setNftMinted(false);
  };

  // Share on X functionality
  const handleShareOnX = () => {
    const text = "I joined the Aztec Guild! 🪿✨";
    const url = `https://sepolia.etherscan.io/tx/${txHash}`; // Link to the transaction
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  // Handle minting Twitter profile as NFT
  const handleMint = async () => {
    if (!twitterUser) return;

    // Check if wallet is connected
    if (!isConnected) {
      setError('Please connect your MetaMask wallet to mint your guild card');
      setPendingMint(true);
      // Try to connect wallet automatically
      try {
        await connect({ connector: connectors[0] });
      } catch (err) {
        console.error('Failed to connect wallet:', err);
        setError('Failed to connect wallet. Please connect manually and try again.');
        setPendingMint(false);
      }
      return;
    }

    // Check if user is on Sepolia
    if (!isOnSepolia) {
      setError('Please switch your wallet network to Sepolia to mint.');
      return;
    }

    setPendingMint(false);
    if (!address) {
      setError('Wallet address not found. Please reconnect your wallet.');
      return;
    }

    setError(null);
    try {
      // 1. Generate PNG from card
      if (!cardExportRef.current) {
        setError('Card not found for export');
        return;
      }
      const canvas = await html2canvas(cardExportRef.current, { useCORS: true, backgroundColor: null });
      const dataUrl = canvas.toDataURL('image/png');
      // Convert dataUrl to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${twitterUser.username}_guild_card.png`, { type: 'image/png' });

      // 2. Upload PNG to IPFS
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        setError(errData.error || 'Failed to upload image to IPFS');
        return;
      }
      const uploadData = await uploadRes.json();
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${uploadData.IpfsHash}`;

      // 3. Create metadata and upload to IPFS
      const firstName = twitterUser.name?.split(' ')[0] || 'Anonymous';
      const metadata = {
        name: `${firstName}'s Guild Card`,
        description: polymathDescription || `A personalized guild member card for ${twitterUser.name} (@${twitterUser.username}). ${twitterUser.bio || ''}`,
        image: imageUrl,
        attributes: [
          {
            trait_type: "Twitter Username",
            value: twitterUser.username
          },
          {
            trait_type: "Polymath Bio",
            value: polymathDescription || twitterUser.bio || "No bio"
          }
        ]
      };
      const metadataCid = await uploadMetadataToIPFS(metadata);
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;

      // 4. Mint NFT with wagmi
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

  // Watch for successful minting
  useEffect(() => {
    if (txHash) {
      setNftMinted(true);
      setError(null);
    }
  }, [txHash]);

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

    // Development mode - bypass OAuth and ask for username
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const username = prompt('Enter a Twitter username to simulate (e.g., "DavidSteinrueck"):');
      if (username) {
        // Simulate Twitter user data
        const mockUserData = {
          id: "123456789",
          username: username,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          bio: `Product marketing lead @aztecnetwork\n 🪿 | Building with @noirlang\n 👽 | Prev @openzeppelin\n & @chainlink\n | Market in prod`,
          profileImage: "https://pbs.twimg.com/profile_images/1907046935607013376/2rzn07BJ.jpg",
        };
        
        localStorage.setItem('twitterUser', JSON.stringify(mockUserData));
        setTwitterUser(mockUserData);
        // No need to call generateCardImage in dev mode
      }
      setTwitterLoading(false);
      return;
    }

    try {
      // Production mode - use real OAuth
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

  // Generate polymath description when Twitter user is set
  useEffect(() => {
    if (twitterUser && twitterUser.bio) {
      setDescLoading(true);
      setDescError(null);
      fetch("/api/generate-polymath-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: twitterUser.bio }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.description) {
            setPolymathDescription(data.description);
          } else {
            setDescError("Could not generate description.");
          }
        })
        .catch(() => setDescError("Could not generate description."))
        .finally(() => setDescLoading(false));
    } else {
      setPolymathDescription(null);
    }
  }, [twitterUser]);

  const handleDownloadCard = async () => {
    try {
      if (!cardExportRef.current) {
        console.error('cardExportRef.current is null');
        return;
      }
      const canvas = await html2canvas(cardExportRef.current, { useCORS: true, backgroundColor: null });
      const dataUrl = canvas.toDataURL('image/png');
      // Download the PNG
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${twitterUser?.username || 'guild_card'}.png`;
      link.click();
    } catch (err) {
      console.error('Failed in handleDownloadCard:', err);
    }
  };

  // Automatically mint after wallet connection if pendingMint is true
  useEffect(() => {
    if (pendingMint && isConnected) {
      handleMint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMint, isConnected]);

  // Guilds and backgrounds
  const guilds = [
    { bg: '/bg0.png', name: 'Guild of Obsession' },
    { bg: '/bg1.png', name: 'Guild of Genius' },
    { bg: '/bg2.png', name: 'Guild of Integrity' },
    { bg: '/bg3.png', name: 'Guild of Agency' },
  ];
  const [guildIdx, setGuildIdx] = useState<number | null>(null);
  useEffect(() => {
    if (guildIdx === null) {
      const idx = Math.floor(Math.random() * guilds.length);
      setGuildIdx(idx);
    }
  }, [guildIdx, guilds.length]);
  const cardBg = guildIdx !== null ? guilds[guildIdx].bg : undefined;
  const guildName = guildIdx !== null ? guilds[guildIdx].name : '';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1400', backgroundImage: 'url(/background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#001F18]/20 pointer-events-none"></div>
      
      <div className="relative z-10 p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        {/* Top bar: Logo/Connect/Disconnect */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center justify-center p-4 shadow relative" style={{ minWidth: 160, minHeight: 100, borderRadius: 0 }}>
            <div className="absolute inset-0 z-0" style={{
              background: 'radial-gradient(circle, #FF2DF4 0%, transparent 80%)',
              filter: 'blur(40px)',
              opacity: 0.9,
              borderRadius: 0
            }} />
            <Image
              src="/azlogo.png"
              alt="Aztec Logo"
              width={120}
              height={80}
              className="object-contain relative z-10 drop-shadow-[0_4px_32px_rgba(255,45,244,0.5)]"
            />
          </div>
          {isConnected ? (
            <div className="flex items-center gap-4">
              <span className="text-sm px-3 py-1" style={{ backgroundColor: '#D4FF28', color: '#1A1400', borderRadius: 0 }}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="px-6 py-2 font-medium transition-all duration-300 hover:scale-105"
                style={{ backgroundColor: '#2e0700', color: '#F2EEE1', borderRadius: 0 }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="px-8 py-3 font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              style={{ 
                background: 'linear-gradient(135deg, #D4FF28 0%, #2BFAE9 100%)',
                color: '#1A1400',
                borderRadius: 0
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Create Card Section */}
        <div className="mb-16 max-w-2xl mx-auto">
          {twitterUser ? (
            descLoading && !descError ? (
              <div className="flex items-center justify-center min-h-[328px]">
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-[#2E0026] opacity-70 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  
                </div>
              </div>
            ) : (
              <div className="p-8 border-2" 
                   style={{ 
                     backgroundColor: '#001F18',
                     borderColor: '#D4FF28',
                     boxShadow: '0 10px 30px rgba(212, 255, 40, 0.2)',
                     borderRadius: 0
                   }}>
                {/* Leonardo-Style Horizontal Guild Card */}
                <div
                  ref={cardExportRef}
                  className="guild-card flex flex-row items-center relative w-[497px] h-[328px] bg-[#f2eee1] border-2 border-[#D4FF28] shadow-lg p-8 mx-auto my-12 transition-transform ease-out will-change-transform [perspective:800px] overflow-hidden"
                  style={{
                    backgroundImage: cardBg ? `url(${cardBg}), linear-gradient(#f2eee1, #e6e0c7)` : `linear-gradient(#f2eee1, #e6e0c7)`,
                    backgroundSize: 'cover',
                    fontFamily: 'Crimson Pro, serif',
                    color: '#D4FF28',
                    transform: `rotateX(var(--x-rotation, 0deg)) rotateY(var(--y-rotation, 0deg)) scale(var(--card-scale, 1))`,
                    transformStyle: 'preserve-3d',
                    perspective: '800px',
                    borderRadius: 0,
                  }}
                  onMouseLeave={ev => {
                    cardBoundingRef.current = null;
                    ev.currentTarget.style.setProperty('--x-rotation', '0deg');
                    ev.currentTarget.style.setProperty('--y-rotation', '0deg');
                    ev.currentTarget.style.setProperty('--card-scale', '1');
                  }}
                  onMouseEnter={ev => {
                    cardBoundingRef.current = ev.currentTarget.getBoundingClientRect();
                  }}
                  onMouseMove={ev => {
                    if (!cardBoundingRef.current) return;
                    const x = ev.clientX - cardBoundingRef.current.left;
                    const y = ev.clientY - cardBoundingRef.current.top;
                    const xPercentage = x / cardBoundingRef.current.width;
                    const yPercentage = y / cardBoundingRef.current.height;
                    const xRotation = (xPercentage - 0.5) * 20;
                    const yRotation = (0.5 - yPercentage) * 20;
                    ev.currentTarget.style.setProperty("--x-rotation", `${yRotation}deg`);
                    ev.currentTarget.style.setProperty("--y-rotation", `${xRotation}deg`);
                    ev.currentTarget.style.setProperty('--card-scale', '1.1');
                  }}
                >
                  {/* Dashed border inside */}
                  <div className="pointer-events-none absolute top-2 left-2 right-2 bottom-2 border-2 border-dashed border-[#D4FF28] z-0" style={{ borderRadius: 0 }} />
                  {/* Radial glare effect */}
                  <div className="pointer-events-none absolute inset-0 group-hover:bg-[radial-gradient(at_var(--x)_var(--y),rgba(255,255,255,0.3)_20%,transparent_80%)] z-10" />
                  {/* Profile Image (use proxy for PNG export) */}
                  <div className="profile-container flex-shrink-0 w-[120px] h-[120px] border-4 border-[#D4FF28] overflow-hidden mr-6 z-10" style={{filter: 'grayscale(100%) contrast(1.2) brightness(0.8)', borderRadius: 0}}>
                    {twitterUser?.profileImage ? (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(twitterUser.profileImage)}`}
                        alt={twitterUser.username}
                        width={120}
                        height={120}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    ) : (
                      <span className="text-[#001F18] font-bold">No Image</span>
                    )}
                  </div>
                  {/* Content */}
                  <div className="content flex-1 z-10">
                    <h1 
                      className="guild-title text-2xl font-bold mb-2 inline-block"
                      style={{
                        fontFamily: 'Crimson Pro, serif',
                        color: '#D4FF28',
                        background: '#00122e',
                        padding: '0.25em 0.75em',
                        borderRadius: 0,
                        boxShadow: '0 2px 8px rgba(0,18,46,0.15)'
                      }}
                    >
                      {guildName}
                    </h1>
                    <p className="twitter-handle text-base mb-4 opacity-90" style={{fontFamily: 'Crimson Pro, serif'}}>
                      @{twitterUser.username}
                    </p>
                    {descError ? (
                      <p className="text-[#FF1A1A] text-base italic">{descError}</p>
                    ) : (
                      <span
                        className="inline-block text-base px-3 py-2"
                        style={{
                          fontFamily: 'EB Garamond, serif',
                          background: '#2E0026',
                          color: '#FF2DF4',
                          lineHeight: 1.5,
                          boxShadow: '0 2px 8px rgba(46,0,38,0.10)',
                          borderRadius: 0
                        }}
                      >
                        {polymathDescription || "Welcome to the Aztec Community! Thank you for being part of our guild."}
                      </span>
                    )}
                  </div>
                </div>
                

          
                
                {/* Mint Profile as NFT Button */}
                <button
                  onClick={nftMinted ? handleShareOnX : handleMint}
                  disabled={isPending}
                  className="w-full py-4 font-bold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  style={{ 
                    background: isPending 
                      ? 'linear-gradient(135deg, #FF1A1A 0%, #FF2DF4 100%)'
                      : nftMinted
                      ? 'linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%)'
                      : 'linear-gradient(135deg, #D4FF28 0%, #2BFAE9 100%)',
                    color: '#1A1400',
                    cursor: 'pointer',
                    borderRadius: 0
                  }}
                >
                  {isPending ? "Minting..." : nftMinted ? "Share on X" : !isConnected ? "Connect Wallet to Mint" : "Mint Guild Card as NFT"}
                </button>
                
                {txHash && (
                  <div className="text-sm p-3 mt-4" style={{ backgroundColor: '#00122E', color: '#2BFAE9', borderRadius: 0 }}>
                    Transaction: {" "}
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                      style={{ color: '#D4FF28', cursor: 'pointer' }}
                    >
                      {txHash}
                    </a>
                  </div>
                )}
                {error && (
                  <div className="text-sm p-3 mt-4" style={{ backgroundColor: '#FF1A1A', color: '#F2EEE1', borderRadius: 0 }}>
                    {error}
                  </div>
                )}
                {/* Download Card as PNG Link */}
                
                <button
                  onClick={e => { e.preventDefault(); handleDownloadCard(); }}
                  className="w-full mt-4 py-2 font-medium transition-all duration-300 hover:scale-105"
                  style={{ 
                    background: 'linear-gradient(135deg, #FF2DF4 0%, #2BFAE9 100%)',
                    color: '#fff',
                    cursor: 'pointer',
                    borderRadius: 0
                  }}
                >
                  Download Card PNG
                </button>

                <div
                  onClick={handleTwitterDisconnect}
                  className="text-base font-medium hover:underline flex justify-center items-center mt-2"
                  style={{ color: '#666666', cursor: 'pointer' }}
                >
                  Disconnect X Account
                </div>
                
              </div>
            )
          ) : (
            <div className="p-8 border-2" 
                 style={{ 
                   backgroundColor: '#001F18',
                   borderColor: '#FF2DF4',
                   boxShadow: '0 10px 30px rgba(255, 45, 244, 0.2)',
                   borderRadius: 0
                 }}>
              <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#F2EEE1' }}>
                Join the Aztec Guild
              </h2>
              <p className="text-center mb-6" style={{ color: '#2BFAE9' }}>
                Connect your X to create a personalized guild member card
              </p>
              <button
                onClick={handleTwitterLogin}
                disabled={twitterLoading}
                className="w-full py-4 font-bold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ 
                  background: twitterLoading 
                    ? 'linear-gradient(135deg, #FF1A1A 0%, #FF2DF4 100%)'
                    : 'linear-gradient(135deg, #D4FF28 0%, #2BFAE9 100%)',
                  color: '#1A1400',
                  borderRadius: 0
                }}
              >
                {twitterLoading ? "Connecting..." : "Generate Member Card"}
              </button>
            </div>
          )}
        </div>

        {/* All NFTs Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold" style={{ color: '#F2EEE1' }}>
              All Guild Members
            </h2>
            <div className="px-4 py-2 text-sm font-medium" 
                 style={{ backgroundColor: '#00122E', color: '#2BFAE9', borderRadius: 0 }}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {nfts.map((nft) => (
                <div key={nft.tokenId} className="group relative overflow-hidden shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl p-4"
                     style={{ backgroundColor: '#001F18', width: '100%', maxWidth: 497, margin: '0 auto', height: 400, borderRadius: 0 }}>
                  {nft.metadata?.image && (
                    <img 
                      src={nft.metadata.image} 
                      alt={nft.metadata.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  )}
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
