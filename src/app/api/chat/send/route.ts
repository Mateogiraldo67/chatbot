// src/app/api/chat/send/route.ts
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
    let n8nWebhookPath = process.env.N8N_WEBHOOK_PATH;

    // Use different webhook paths based on backend selection
    if (body.backend === 'gemini') {
      n8nWebhookPath = process.env.N8N_GEMINI_WEBHOOK_PATH || n8nWebhookPath;
    } else if (body.backend === 'chatgpt') {
      n8nWebhookPath = process.env.N8N_WEBHOOK_PATH; // Keep using the default path for ChatGPT
    }

    if (!n8nBaseUrl || !n8nWebhookPath) {
      return new Response(JSON.stringify({ error: 'N8N configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const webhookUrl = `${n8nBaseUrl}${n8nWebhookPath}`;
    console.log('Webhook URL:', webhookUrl);
    console.log('Backend:', body.backend);

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
              temperature: body.temperature || 0,
              backend: body.backend || 'python' // Add backend parameter
            })
          });

          console.log('N8N Response Status:', response.status);
          console.log('N8N Response OK:', response.ok);
          console.log('N8N Response Headers:', Object.fromEntries(response.headers.entries()));

          if (!response.ok) {
            // If N8N fails, use mock response for testing
            console.warn(`N8N webhook failed: ${response.status}, using mock response`);
            const mockResponse: N8nWebhookResponse = {
              output: `Esta es una respuesta simulada para tu pregunta: "${body.chatInput}". El sistema está funcionando correctamente, pero el webhook de N8N en ${webhookUrl} no está disponible en este momento. Por favor, verifica que tu workflow de N8N esté activo y accesible.`,
              sources: [
                {
                  title: "Documentación N8N",
                  url: "https://docs.n8n.io/webhooks/",
                  snippet: "Información sobre configuración de webhooks en N8N"
                }
              ],
              usage: {
                promptTokens: 20,
                completionTokens: 50,
                totalTokens: 70
              }
            };
            
            // Process mock response
            const chunks = chunkText(mockResponse.output, 700);
            
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              const isLast = i === chunks.length - 1;
              
              const eventData = {
                type: 'chunk',
                content: chunk,
                isLast,
                ...(isLast && { sources: mockResponse.sources }),
                ...(isLast && { usage: mockResponse.usage })
              };
    
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
              
              if (!isLast) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            controller.enqueue(encoder.encode('data: {"type": "done"}\n\n'));
            return;
          }

          // Log raw response for debugging
          const rawResponse = await response.text();
          console.log('Raw N8N Response:', rawResponse);
          
          // Try to parse the response
          let n8nResponse: N8nWebhookResponse;
          try {
            n8nResponse = JSON.parse(rawResponse);
          } catch (parseError) {
            console.error('Failed to parse N8N response:', parseError);
            throw new Error(`Invalid JSON response from N8N: ${rawResponse.substring(0, 100)}...`);
          }
          
          console.log('Parsed N8N Response:', n8nResponse);
          
          // Validate response structure
          if (!n8nResponse.output) {
            console.warn('N8N response missing output field');
            n8nResponse = {
              output: `El flujo de N8N se ejecutó correctamente pero no devolvió una respuesta válida. La estructura de la respuesta no contiene el campo "output" esperado. Contenido recibido: ${JSON.stringify(n8nResponse).substring(0, 200)}...`,
              sources: [],
              usage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
              }
            };
          }
          
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