import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { bio } = await req.json();
    if (!bio || typeof bio !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid bio' }, { status: 400 });
    }

    const prompt = `Rewrite the following Twitter bio in the style of a Renaissance polymath. Make it eloquent, learned, a bit whimsical, and concise. Limit your response to a single, short sentence, no longer than 300 characters.\n\nBio: "${bio}"\n\nPolymath-style description:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a Renaissance polymath, skilled in the arts, sciences, and letters.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.8,
    });

    let description = completion.choices[0]?.message?.content?.trim() || '';
    if (description.length > 300) {
      description = description.slice(0, 297) + '...';
    }
    return NextResponse.json({ description });
  } catch (err) {
    console.error('OpenAI error:', err);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
} 