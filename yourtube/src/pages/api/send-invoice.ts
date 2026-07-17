import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

// Emails a plan-upgrade invoice after a successful payment.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, name, plan, amount, paymentId } = req.body || {};
  if (!email || !plan || !paymentId) {
    return res.status(400).json({ sent: false, error: "Missing fields" });
  }

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log("Invoice (SMTP not configured):", { email, plan, amount, paymentId });
    return res
      .status(200)
      .json({ sent: false, error: "SMTP not configured — invoice logged" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const date = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    await transporter.sendMail({
      from: `"YourTube" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `YourTube Invoice — ${String(plan).toUpperCase()} plan`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:#dc2626;color:#fff;padding:16px 24px">
            <h2 style="margin:0">YourTube — Payment Invoice</h2>
          </div>
          <div style="padding:24px">
            <p>Hi ${name || "there"},</p>
            <p>Thank you for upgrading! Here are your transaction details:</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;border-bottom:1px solid #eee">Plan</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;text-transform:capitalize">${plan}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee">Amount</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">₹${amount}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee">Payment ID</td><td style="padding:8px;border-bottom:1px solid #eee">${paymentId}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee">Date</td><td style="padding:8px;border-bottom:1px solid #eee">${date} IST</td></tr>
            </table>
            <p style="color:#777;font-size:12px;margin-top:24px">This is a test-mode transaction made via Razorpay.</p>
          </div>
        </div>`,
    });
    return res.status(200).json({ sent: true });
  } catch (e: any) {
    console.error("Invoice email failed:", e);
    return res.status(200).json({ sent: false, error: e.message });
  }
}
