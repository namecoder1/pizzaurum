export async function POST(req: Request) {
  console.log('🟡 Payment Sheet Test API called');
  
  try {
    console.log('🟡 Parsing request...');
    const body = await req.json();
    console.log('🟡 Request parsed:', JSON.stringify(body, null, 2));
    
    return Response.json({
      success: true,
      message: 'Test API working',
      receivedData: body
    });
    
  } catch (error) {
    console.log('❌ Test API error:', error);
    return Response.json(
      { 
        error: 'Test API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
