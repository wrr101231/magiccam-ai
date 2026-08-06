import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, activationToken } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!activationToken) {
      return NextResponse.json({ error: 'Missing activation token. Please activate your software.' }, { status: 401 });
    }

    // Very basic verification of the token format. 
    // In production, we'd verify the JWT signature here against our secret key.
    const parts = activationToken.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid activation token' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured on the server.' }, { status: 500 });
    }

    // Call OpenAI
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024"
      })
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.text();
      console.error('OpenAI generation failed:', errData);
      return NextResponse.json({ error: 'Failed to generate background image.' }, { status: openaiRes.status });
    }

    const data = await openaiRes.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      return NextResponse.json({ error: 'Invalid response from AI service.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: data.data[0].url });

  } catch (error: any) {
    console.error('generate-bg error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
