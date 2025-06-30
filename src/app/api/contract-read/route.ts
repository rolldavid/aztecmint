import { NextRequest } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export const runtime = "nodejs";

// Get RPC URL from environment variables
// Only use backend variables (do NOT use NEXT_PUBLIC_ variables here)
const getRpcUrl = () => {
  let rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl && process.env.INFURA_PROJECT_ID) {
    rpcUrl = `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  }
  if (!rpcUrl) {
    throw new Error("No Sepolia RPC URL configured. Please set SEPOLIA_RPC_URL or INFURA_PROJECT_ID in your environment variables.");
  }
  return rpcUrl;
};

// Create a public client for reading from the blockchain
const client = createPublicClient({
  chain: sepolia,
  transport: http(getRpcUrl()),
});

export async function POST(req: NextRequest) {
  try {
    const { address, abi, functionName, args } = await req.json();

    if (!address || !abi || !functionName) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
    }

    console.log(`Reading contract: ${functionName} with args:`, args);
    console.log(`Contract address: ${address}`);
    console.log(`RPC URL: ${getRpcUrl()}`);

    // Read from contract
    const result = await client.readContract({
      address: address as `0x${string}`,
      abi,
      functionName,
      args,
    });

    console.log(`Contract read result for ${functionName}:`, result);

    // Fix: Convert BigInt to string for JSON serialization
    return new Response(
      JSON.stringify({ data: result }, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
      { status: 200 }
    );
  } catch (error) {
    console.error("Contract read error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to read from contract", 
      details: error instanceof Error ? error.message : String(error)
    }), { status: 500 });
  }
} 