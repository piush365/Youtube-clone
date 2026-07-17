import type { NextApiRequest, NextApiResponse } from "next";

// Creates a Razorpay order using the REST API directly (no SDK needed).
// Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test keys work).
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(503).json({ error: "Razorpay keys not configured" });
  }

  const amount = Number(req.body?.amount);
  if (!amount || amount <= 0 || amount > 100000) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `yt_${Date.now()}`,
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok) {
      return res
        .status(502)
        .json({ error: order?.error?.description || "Order creation failed" });
    }
    return res.status(200).json({ orderId: order.id, keyId });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
