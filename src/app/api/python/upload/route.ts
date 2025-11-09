import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://back.jhosbandev.site';

// Set up SSL configuration for development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export async function POST(req: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create a new FormData object to forward to the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    console.log('Sending file to backend:', file.name, 'Size:', file.size, 'bytes');
    console.log('Backend URL:', `${BACKEND_URL}/build_chatbot`);

    // Configure fetch options to handle SSL issues
    const fetchOptions: RequestInit = {
      method: 'POST',
      body: backendFormData,
    };

    // For development/testing, you might need to disable SSL verification
    // WARNING: Only use this in development, never in production
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_SSL_VERIFY === 'true') {
      // This is handled by Node.js environment variable NODE_TLS_REJECT_UNAUTHORIZED
      console.log('SSL verification disabled for development');
    }

    // Send the file to the production backend
    const response = await fetch(`${BACKEND_URL}/build_chatbot`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, response.statusText, errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Backend response:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error uploading file to backend:', error);
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('DEPTH_ZERO_SELF_SIGNED_CERT')) {
        return NextResponse.json(
          { 
            error: 'SSL certificate error. The backend server is using a self-signed certificate.',
            details: 'This is a server configuration issue. Please contact the backend administrator.',
            code: 'SSL_CERT_ERROR'
          },
          { status: 502 }
        );
      } else if (error.message.includes('fetch failed')) {
        return NextResponse.json(
          { 
            error: 'Failed to connect to backend server.',
            details: 'Please check if the backend server is running and accessible.',
            code: 'CONNECTION_ERROR'
          },
          { status: 502 }
        );
      } else if (error.message.includes('ENOTFOUND')) {
        return NextResponse.json(
          { 
            error: 'Backend server not found.',
            details: 'DNS resolution failed. Please check the backend URL.',
            code: 'DNS_ERROR'
          },
          { status: 502 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}