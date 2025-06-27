# Deployment Guide - Sepolia Testnet

## Prerequisites

1. **Get Sepolia ETH** (testnet tokens):
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Or use [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
   - You need at least 0.1 ETH for deployment

2. **Get Infura Project ID**:
   - Go to [Infura](https://infura.io/)
   - Create a new project
   - Copy your Project ID

3. **Get Etherscan API Key** (optional, for verification):
   - Go to [Etherscan](https://etherscan.io/)
   - Create an account and get API key

## Environment Setup

Create a `.env` file in your project root:

```bash
# Your wallet private key (for deployment)
PRIVATE_KEY=your_wallet_private_key_here

# Infura Project ID
INFURA_PROJECT_ID=your_infura_project_id_here

# Etherscan API Key (optional)
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Pinata API Keys
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_KEY=your_pinata_secret_key_here
```

## Deploy to Sepolia

1. **Compile the contract**:
   ```bash
   forge build
   ```

2. **Deploy to Sepolia**:
   ```bash
   forge script script/DeploySepolia.s.sol:DeploySepolia --rpc-url sepolia --broadcast --verify
   ```

3. **Copy the deployed contract address** from the console output.

## Update Frontend

1. **Update contract address** in `src/app/page.tsx`:
   ```typescript
   const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
   ```

2. **Update wagmi configuration** in `src/app/wagmi.ts` to include Sepolia:
   ```typescript
   import { sepolia } from 'wagmi/chains'
   
   export const config = createConfig({
     chains: [sepolia],
     // ... rest of config
   })
   ```

## Test Your Deployment

1. **Switch your wallet to Sepolia testnet**
2. **Connect your wallet** to the app
3. **Upload an image and mint an NFT**
4. **Check the transaction** on [Sepolia Etherscan](https://sepolia.etherscan.io/)

## Troubleshooting

- **"Insufficient funds"**: Get more Sepolia ETH from faucet
- **"Nonce too low"**: Wait a few minutes or increase gas price
- **"Contract verification failed"**: Check your Etherscan API key

## Network Information

- **Chain ID**: 11155111
- **RPC URL**: https://sepolia.infura.io/v3/YOUR_PROJECT_ID
- **Block Explorer**: https://sepolia.etherscan.io/
- **Currency**: Sepolia ETH (testnet) 