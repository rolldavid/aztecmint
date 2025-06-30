import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, username } = await req.json();
    if (!imageUrl || !username) {
      return NextResponse.json({ error: 'Missing imageUrl or username' }, { status: 400 });
    }

    // Fetch the image
    const res = await fetch(imageUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure directory exists
    const dir = path.join(process.cwd(), 'public', 'twitter-images');
    await fs.mkdir(dir, { recursive: true });

    // Save as jpg (Twitter images are usually jpg/png)
    const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${username}.${ext}`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);

    // Return the local URL
    const localUrl = `/twitter-images/${filename}`;
    return NextResponse.json({ url: localUrl });
  } catch (err) {
    console.error('Error caching Twitter image:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 