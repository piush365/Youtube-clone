import type { NextConfig } from "next";

// Routes that render the PDF invoice (verify, webhook, resend) need the fonts
// in their serverless bundle.
const INVOICE_ROUTES = ["/api/payments/verify", "/api/payments/webhook", "/api/payments/resend-invoice"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // pdfkit reads its AFM data from its own package directory at runtime,
  // which breaks if it's bundled.
  serverExternalPackages: ["pdfkit"],
  // Pin the test-only emulator flag at build time so its code is compiled
  // out of normal builds instead of just being inert.
  env: { NEXT_PUBLIC_USE_EMULATORS: process.env.NEXT_PUBLIC_USE_EMULATORS === "true" ? "true" : "false" },
  outputFileTracingIncludes: Object.fromEntries(INVOICE_ROUTES.map((r) => [r, ["./assets/fonts/**"]])),
};

export default nextConfig;
