import { printLog } from "@/lib/utils";
import { Twilio } from "twilio";

export async function POST(request: Request) {
  try {
    const { 
      phone, 
      message
    } = await request.json();

    if (!phone || !message) {
      return Response.json(
        { error: "Phone number and message are required" },
        { status: 400 }
      );
    }
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SID;

    if (!accountSid || !authToken || !serviceSid) {
      printLog("Missing Twilio credentials", true);
      return Response.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    const twilioClient = new Twilio(accountSid, authToken);

   const twilioMessage = await twilioClient.messages.create({
    body: message,
    from: process.env.EXPO_PUBLIC_TWILIO_PHONE_NUMBER,
    to: phone,
   })

   return Response.json({
    success: true,
    message: "Message sent successfully",
    sid: twilioMessage.sid,
   })
  } catch (error) {
    printLog(`❌ Error sending message: ${error}`, true);
    return Response.json(
      {
        error: "Failed to send message",
      },
      { status: 500 }
    );
  }
}