import { NextRequest } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export const runtime = "nodejs";

// Get RPC URL from environment variables
const getRpcUrl = () => {
  let rpcUrl = process.env.SEPOLIA_RPC_URL;
  
  if (!rpcUrl && process.env.INFURA_PROJECT_ID) {
    rpcUrl = `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  }
  
  if (!rpcUrl) {
    throw new Error("No Sepolia RPC URL configured");
  }
  
  return rpcUrl;
};

export async function GET() {
  try {
    const client = createPublicClient({
      chain: sepolia,
      transport: http(getRpcUrl()),
    });

    // Test the connection by getting the latest block number
    const blockNumber = await client.getBlockNumber();
    
    return new Response(JSON.stringify({ 
      success: true, 
      blockNumber: blockNumber.toString(),
      rpcUrl: getRpcUrl()
    }), { status: 200 });
  } catch (error) {
    console.error("RPC test error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      rpcUrl: getRpcUrl()
    }), { status: 500 });
  }
} 