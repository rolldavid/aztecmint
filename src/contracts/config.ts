// Import ABI from Foundry artifacts
import contractArtifact from '../../artifacts/UniqueImageNFT.sol/UniqueImageNFT.json';

// Contract configuration
export const CONTRACT_CONFIG = {
  // Update this address after deployment
  address: "0x8Db661081b6e7a3E1348cD66A59aE1b33d17D07e" as `0x${string}`,
  abi: contractArtifact.abi,
} as const;

// Export individual values for convenience
export const CONTRACT_ADDRESS = CONTRACT_CONFIG.address;
export const CONTRACT_ABI = CONTRACT_CONFIG.abi; 