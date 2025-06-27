import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const metadata = await req.json();

    if (!metadata) {
      return new Response(JSON.stringify({ error: "No metadata provided" }), { status: 400 });
    }

    // Prepare Pinata API keys
    const PINATA_API_KEY = process.env.PINATA_API_KEY!;
    const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY!;

    // Upload metadata to Pinata
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_KEY,
      } as any,
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: "Failed to upload metadata to Pinata", details: error }), { status: 500 });
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON data" }), { status: 400 });
  }
} 