import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the N8N webhook endpoint
    await page.route('**/api/chat/send', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      // Simulate N8N response with chunks
      const mockResponse = {
        output: `Esta es una respuesta simulada para: "${postData.chatInput}". Esta respuesta está siendo dividida en chunks para demostrar el streaming de datos. Aquí hay más contenido para hacer la respuesta más larga y poder observar el efecto de chunking en acción.`,
        sources: [
          {
            title: 'Fuente de ejemplo 1',
            url: 'https://example.com/1',
            snippet: 'Este es un snippet de ejemplo de la primera fuente'
          },
          {
            title: 'Fuente de ejemplo 2', 
            url: 'https://example.com/2',
            snippet: 'Este es un snippet de ejemplo de la segunda fuente'
          }
        ],
        usage: {
          promptTokens: 50,
          completionTokens: 100,
          totalTokens: 150
        }
      };

      // Simulate SSE streaming
      const chunks = [];
      const chunkSize = 50;
      for (let i = 0; i < mockResponse.output.length; i += chunkSize) {
        chunks.push(mockResponse.output.slice(i, i + chunkSize));
      }

      let sseData = 'data: {"type": "connected"}\\n\\n';
      
      chunks.forEach((chunk, index) => {
        const isLast = index === chunks.length - 1;
        const chunkData = {
          type: 'chunk',
          content: chunk,
          isLast,
          ...(isLast && { sources: mockResponse.sources }),
          ...(isLast && { usage: mockResponse.usage })
        };
        sseData += `data: ${JSON.stringify(chunkData)}\\n\\n`;
      });
      
      sseData += 'data: {"type": "done"}\\n\\n';

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: sseData
      });
    });

    await page.goto('/');
  });

  test('should display chat interface correctly', async ({ page }) => {
    // Check if main elements are present
    await expect(page.getByTestId('chat-title')).toBeVisible();
    await expect(page.getByTestId('chat-title')).toHaveText('Chat Inteligente');
    
    await expect(page.getByTestId('chat-input')).toBeVisible();
    await expect(page.getByTestId('send-button')).toBeVisible();
    await expect(page.getByTestId('settings-toggle')).toBeVisible();
    await expect(page.getByTestId('clear-chat')).toBeVisible();
    
    await expect(page.getByTestId('messages-container')).toBeVisible();
  });

  test('should toggle settings panel', async ({ page }) => {
    // Settings panel should not be visible initially
    await expect(page.getByTestId('settings-panel')).not.toBeVisible();
    
    // Click settings toggle
    await page.getByTestId('settings-toggle').click();
    
    // Settings panel should be visible now
    await expect(page.getByTestId('settings-panel')).toBeVisible();
    await expect(page.getByTestId('topk-input')).toBeVisible();
    await expect(page.getByTestId('temperature-input')).toBeVisible();
    
    // Click settings toggle again to hide
    await page.getByTestId('settings-toggle').click();
    await expect(page.getByTestId('settings-panel')).not.toBeVisible();
  });

  test('should send message and receive response', async ({ page }) => {
    const testMessage = '¿Qué es la inteligencia artificial?';
    
    // Type message
    await page.getByTestId('chat-input').fill(testMessage);
    
    // Send message
    await page.getByTestId('send-button').click();
    
    // Check if user message appears
    await expect(page.getByTestId('message-user')).toBeVisible();
    await expect(page.getByTestId('message-user')).toContainText(testMessage);
    
    // Check if loading indicator appears
    await expect(page.getByTestId('loading-indicator')).toBeVisible();
    
    // Wait for assistant response
    await expect(page.getByTestId('message-assistant')).toBeVisible({ timeout: 10000 });
    
    // Check if loading indicator disappears
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible();
    
    // Check if response contains expected content
    const assistantMessage = page.getByTestId('message-assistant');
    await expect(assistantMessage).toContainText('Esta es una respuesta simulada para');
    await expect(assistantMessage).toContainText(testMessage);
    
    // Check if input is cleared
    await expect(page.getByTestId('chat-input')).toHaveValue('');
  });

  test('should display sources and usage information', async ({ page }) => {
    // Send a message
    await page.getByTestId('chat-input').fill('Test message');
    await page.getByTestId('send-button').click();
    
    // Wait for response
    await expect(page.getByTestId('message-assistant')).toBeVisible({ timeout: 10000 });
    
    // Check for sources
    await expect(page.getByTestId('source-link-0')).toBeVisible();
    await expect(page.getByTestId('source-link-1')).toBeVisible();
    
    // Verify source content
    await expect(page.getByTestId('source-link-0')).toHaveText('Fuente de ejemplo 1');
    await expect(page.getByTestId('source-link-0')).toHaveAttribute('href', 'https://example.com/1');
    
    // Check for usage information
    await expect(page.getByTestId('usage-info')).toBeVisible();
    await expect(page.getByTestId('usage-info')).toContainText('Tokens: 150');
    await expect(page.getByTestId('usage-info')).toContainText('prompt: 50');
    await expect(page.getByTestId('usage-info')).toContainText('completion: 100');
  });

  test('should clear chat messages', async ({ page }) => {
    // Send a message first
    await page.getByTestId('chat-input').fill('Test message');
    await page.getByTestId('send-button').click();
    
    // Wait for messages to appear
    await expect(page.getByTestId('message-user')).toBeVisible();
    await expect(page.getByTestId('message-assistant')).toBeVisible({ timeout: 10000 });
    
    // Clear chat
    await page.getByTestId('clear-chat').click();
    
    // Check that messages are cleared
    await expect(page.getByTestId('message-user')).not.toBeVisible();
    await expect(page.getByTestId('message-assistant')).not.toBeVisible();
  });

  test('should disable send button when input is empty', async ({ page }) => {
    // Initially, input should be empty and button disabled
    await expect(page.getByTestId('chat-input')).toHaveValue('');
    await expect(page.getByTestId('send-button')).toBeDisabled();
    
    // Type something
    await page.getByTestId('chat-input').fill('Some text');
    await expect(page.getByTestId('send-button')).toBeEnabled();
    
    // Clear input
    await page.getByTestId('chat-input').fill('');
    await expect(page.getByTestId('send-button')).toBeDisabled();
  });
});