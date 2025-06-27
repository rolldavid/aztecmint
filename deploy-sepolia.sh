#!/bin/bash

echo "🚀 Deploying UniqueImageNFT to Sepolia Testnet..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your configuration:"
    echo "PRIVATE_KEY=your_wallet_private_key"
    echo "INFURA_PROJECT_ID=your_infura_project_id"
    echo "ETHERSCAN_API_KEY=your_etherscan_api_key"
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

if [ -z "$INFURA_PROJECT_ID" ]; then
    echo "❌ Error: INFURA_PROJECT_ID not set in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"

# Build the project
echo "🔨 Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"

# Deploy to Sepolia
echo "📡 Deploying to Sepolia..."
forge script script/DeploySepolia.s.sol:DeploySepolia \
    --rpc-url "https://sepolia.infura.io/v3/$INFURA_PROJECT_ID" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --verify \
    --etherscan-api-key "$ETHERSCAN_API_KEY"

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Your contract has been deployed to Sepolia!"
    echo "📝 Don't forget to update the CONTRACT_ADDRESS in src/app/page.tsx"
    echo "🔗 Check your transaction on Sepolia Etherscan"
else
    echo "❌ Deployment failed!"
    exit 1
fi 