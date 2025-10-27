export async function GET() {
  console.log('🟡 Test API GET called');
  return Response.json({ message: 'Test API working', timestamp: new Date().toISOString() });
}

export async function POST(req: Request) {
  console.log('🟡 Test API POST called');
  
  try {
    const body = await req.json();
    console.log('🟡 Test API received:', JSON.stringify(body, null, 2));
    
    return Response.json({
      success: true,
      message: 'Test API POST working',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log('❌ Test API error:', error);
    return Response.json(
      { 
        error: 'Test API failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
