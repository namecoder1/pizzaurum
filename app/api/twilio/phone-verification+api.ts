import { printLog } from "@/lib/utils";
import { Twilio } from "twilio";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return Response.json(
        { error: "Phone number is required" },
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

    const verification = await twilioClient.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: "sms" });

    return Response.json({
      success: true,
      message: "OTP sent successfully",
      sid: verification.sid,
    });
  } catch (error) {
    printLog(`❌ Error sending OTP: ${error}`, true);
    return Response.json(
      {
        error: "Failed to send OTP",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return Response.json(
        { error: "Phone number and code are required" },
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

    const verificationCheck = await twilioClient.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code: code });

    if (verificationCheck.status === "approved") {
      return Response.json({
        success: true,
        message: "Phone number verified successfully",
      });
    } else {
      return Response.json(
        {
          error: "Invalid verification code",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    printLog(`❌ Error verifying OTP: ${error}`, true);
    return Response.json(
      {
        error: "Failed to verify OTP",
      },
      { status: 500 }
    );
  }
}
