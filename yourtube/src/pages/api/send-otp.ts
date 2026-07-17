import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import nodemailer from "nodemailer";

const OTP_SECRET = process.env.OTP_SECRET || "yourtube-otp-secret";

export const signOtp = (otp: string, identity: string, expiry: number) =>
  crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${otp}:${identity}:${expiry}`)
    .digest("hex");

// Sends a 6-digit OTP. channel = "email" (South India) or "sms" (elsewhere).
// Email uses SMTP creds from env. SMS has no gateway configured, so in test
// mode the OTP is returned in the response and shown to the user on screen.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channel, email, phone } = req.body || {};
  const identity = channel === "email" ? email : phone || email;
  if (!identity) {
    return res.status(400).json({ error: "Missing email/phone" });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = Date.now() + 5 * 60 * 1000;
  const token = signOtp(otp, identity, expiry);

  let delivered = false;
  let demoOtp: string | undefined;

  if (channel === "email" && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      await transporter.sendMail({
        from: `"YourTube" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: "Your YourTube login OTP",
        html: `<div style="font-family:Arial,sans-serif;padding:16px">
            <h2 style="color:#dc2626">YourTube</h2>
            <p>Your one-time password is:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
            <p>This code expires in 5 minutes.</p>
          </div>`,
      });
      delivered = true;
    } catch (e) {
      console.error("OTP email failed:", e);
    }
  }

  // SMS gateway not configured (test mode) or email failed: surface the OTP
  // in the response so the flow can still be demonstrated end to end.
  if (!delivered) {
    demoOtp = otp;
  }

  return res.status(200).json({
    token,
    expiry,
    channel,
    delivered,
    ...(demoOtp ? { demoOtp } : {}),
  });
}
