import { printLog } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    printLog(`🔍 Testing email service connectivity...`);

    const response = await fetch('https://email.pizzaurum.store/api/send/purchase-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'Test',
        orderId: 'test-123',
        email: 'test@example.com'
      }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    printLog(`🔍 Email service test response: ${response.status}`);

    if (response.ok) {
      return Response.json({
        success: true,
        message: 'Email service is reachable',
        status: response.status
      });
    } else {
      const errorText = await response.text();
      return Response.json({
        success: false,
        message: 'Email service returned error',
        status: response.status,
        error: errorText
      }, { status: 500 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    printLog(`❌ Email service test error: ${errorMessage}`, true);
    
    return Response.json({
      success: false,
      message: 'Email service is not reachable',
      error: errorMessage
    }, { status: 500 });
  }
}
