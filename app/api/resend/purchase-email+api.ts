import { printLog } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { firstName, orderId, email } = await request.json()
    
    printLog(`📧 Purchase email API called with: firstName=${firstName}, orderId=${orderId}, email=${email}`);
    
    if (!email || !firstName || !orderId) {
      printLog(`❌ Missing required fields: email=${!!email}, firstName=${!!firstName}, orderId=${!!orderId}`, true);
      return Response.json(
        { error: 'Email, nome e orderId sono richiesti' },
        { status: 400 }
      )
    }

    printLog(`📧 Attempting to send email to external API...`);

    // Invia l'email usando la tua API esterna con header admin
    const response = await fetch('https://email.pizzaurum.store/api/send/purchase-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        orderId,
        email
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    printLog(`📧 External API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      printLog(`❌ External API error: ${response.status} - ${errorText}`, true);
      return Response.json(
        { error: `Errore nell'invio dell'email: ${response.status} - ${errorText}` },
        { status: 500 }
      )
    }

    const responseData = await response.text();
    printLog(`✅ Email sent successfully: ${responseData}`);

    return Response.json({ 
      success: true, 
      message: 'Email di acquisto inviata con successo' 
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    printLog(`❌ Purchase email API error: ${errorMessage}`, true);
    return Response.json(
      { error: `Errore interno del server: ${errorMessage}` },
      { status: 500 }
    )
  }
}
