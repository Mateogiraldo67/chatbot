import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://back.jhosbandev.site';

export async function GET(
  req: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const chatbotId = params.chatbotId;
    
    if (!chatbotId) {
      return NextResponse.json({ error: 'Chatbot ID is required' }, { status: 400 });
    }

    console.log('Checking status for chatbot:', chatbotId);

    // Check the chatbot status from the production backend
    const response = await fetch(`${BACKEND_URL}/chatbot_status/${chatbotId}`, {
      method: 'GET',
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
    console.log('Status response:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking chatbot status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}