// src/app/api/upload/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs"; // Ensure this runs on the Node.js runtime

export async function POST(req: NextRequest) {
  // Parse the incoming form data
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
  }

  // Prepare Pinata API keys
  const PINATA_API_KEY = process.env.PINATA_API_KEY!;
  const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY!;

  // Prepare form data for Pinata
  const pinataForm = new FormData();
  pinataForm.append("file", file, file.name);

  // Upload to Pinata
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      "pinata_api_key": PINATA_API_KEY,
      "pinata_secret_api_key": PINATA_SECRET_KEY,
    } as Record<string, string>,
    body: pinataForm as FormData,
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(JSON.stringify({ error: "Failed to upload to Pinata", details: error }), { status: 500 });
  }

  const result = await response.json();
  return new Response(JSON.stringify(result), { status: 200 });
}