import { printLog } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { to, title, body, data, sound, priority, channelId } = await request.json();

    if (!to || !title || !body) {
      return Response.json(
        { error: "Missing required fields: to, title, body" },
        { status: 400 }
      );
    }

    // Invia notifica tramite Expo Push Service
    const expoPushTokens = Array.isArray(to) ? to : [to];
    
    const messages = expoPushTokens.map(pushToken => ({
      to: pushToken,
      sound: sound || 'default',
      title,
      body,
      data: data || {},
      priority: priority || 'default',
      channelId: channelId || 'default'
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      printLog(`❌ Expo Push Service error: ${response.status} - ${errorText}`, true);
      return Response.json(
        { error: `Expo Push Service error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Log del risultato
    if (result.data) {
      const successCount = result.data.filter((ticket: any) => ticket.status === 'ok').length;
      const errorCount = result.data.filter((ticket: any) => ticket.status === 'error').length;
      
      printLog(`✅ Push notification sent: ${successCount} success, ${errorCount} errors`);
      
      // Log degli errori specifici
      result.data.forEach((ticket: any, index: number) => {
        if (ticket.status === 'error') {
          printLog(`❌ Push token ${index} error: ${ticket.message}`, true);
        }
      });
    }

    return Response.json({ 
      success: true, 
      data: result.data,
      message: `Notification sent to ${expoPushTokens.length} device(s)`
    });

  } catch (error) {
    printLog(`❌ Error sending push notification: ${error}`, true);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
