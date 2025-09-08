import { NextRequest } from 'next/server';
import { ChatRequest, N8nWebhookResponse } from '@/types/chat';

function chunkText(text: string, chunkSize: number = 700): string[] {
  const chunks: string[] = [];
  let currentIndex = 0;
  
  while (currentIndex < text.length) {
    let endIndex = currentIndex + chunkSize;
    
    // If we're not at the end of the text, try to find a good breaking point
    if (endIndex < text.length) {
      // Look for sentence endings first
      const sentenceEnd = text.lastIndexOf('.', endIndex);
      const questionEnd = text.lastIndexOf('?', endIndex);
      const exclamationEnd = text.lastIndexOf('!', endIndex);
      
      const maxSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      
      if (maxSentenceEnd > currentIndex) {
        endIndex = maxSentenceEnd + 1;
      } else {
        // Fall back to word boundaries
        const spaceIndex = text.lastIndexOf(' ', endIndex);
        if (spaceIndex > currentIndex) {
          endIndex = spaceIndex;
        }
      }
    }
    
    chunks.push(text.slice(currentIndex, endIndex).trim());
    currentIndex = endIndex;
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    
    if (!body.chatInput || body.chatInput.trim() === '') {
      return new Response(JSON.stringify({ error: 'chatInput is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const n8nBaseUrl = process.env.N8N_BASE_URL;
    const n8nWebhookPath = process.env.N8N_WEBHOOK_PATH;

    if (!n8nBaseUrl || !n8nWebhookPath) {
      return new Response(JSON.stringify({ error: 'N8N configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const webhookUrl = `${n8nBaseUrl}${n8nWebhookPath}`;

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection event
          controller.enqueue(encoder.encode('data: {"type": "connected"}\n\n'));

          // Call n8n webhook
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatInput: body.chatInput,
              topK: body.topK || 5,
              temperature: body.temperature || 0.7
            })
          });

          if (!response.ok) {
            throw new Error(`N8N webhook failed: ${response.status}`);
          }

          const n8nResponse: N8nWebhookResponse = await response.json();
          
          // Chunk the response text
          const chunks = chunkText(n8nResponse.output, 700);
          
          // Send chunks with delay to simulate streaming
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const isLast = i === chunks.length - 1;
            
            const eventData = {
              type: 'chunk',
              content: chunk,
              isLast,
              ...(isLast && n8nResponse.sources && { sources: n8nResponse.sources }),
              ...(isLast && n8nResponse.usage && { usage: n8nResponse.usage })
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
            
            // Small delay between chunks
            if (!isLast) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          // Send completion event
          controller.enqueue(encoder.encode('data: {"type": "done"}\n\n'));
          
        } catch (error) {
          console.error('SSE Stream Error:', error);
          const errorEvent = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}