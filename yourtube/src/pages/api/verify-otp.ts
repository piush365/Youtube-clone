import type { NextApiRequest, NextApiResponse } from "next";
import { signOtp } from "./send-otp";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { otp, identity, expiry, token } = req.body || {};
  if (!otp || !identity || !expiry || !token) {
    return res.status(400).json({ valid: false, error: "Missing fields" });
  }
  if (Date.now() > Number(expiry)) {
    return res.status(200).json({ valid: false, error: "OTP expired" });
  }

  const expected = signOtp(String(otp), identity, Number(expiry));
  const valid = expected === token;
  return res.status(200).json({ valid });
}
