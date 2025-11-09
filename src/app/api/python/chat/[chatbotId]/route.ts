import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://back.jhosbandev.site';

export async function POST(
  req: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const chatbotId = params.chatbotId;
    const body = await req.json();
    
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }

    if (!body.question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log('Sending question to chatbot:', chatbotId, body.question);

    // Send the question to the production backend
    const response = await fetch(`${BACKEND_URL}/ask_chatbot/${chatbotId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: body.question,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Answer received:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error asking chatbot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}