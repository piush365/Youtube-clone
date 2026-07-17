declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentResult {
  paymentId: string;
  orderId?: string;
  signature?: string;
}

const loadScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const payWithRazorpay = async (opts: {
  amountInRupees: number;
  description: string;
  name?: string | null;
  email?: string | null;
}): Promise<PaymentResult> => {
  const loaded = await loadScript();
  if (!loaded) throw new Error("Failed to load Razorpay checkout");

  // Create an order server-side when keys are configured; fall back to the
  // legacy key-only checkout (works with test keys) if the API is unavailable.
  let orderId: string | undefined;
  let keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  try {
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: opts.amountInRupees }),
    });
    if (res.ok) {
      const data = await res.json();
      orderId = data.orderId;
      keyId = data.keyId || keyId;
    }
  } catch {
    // fall back to key-only checkout
  }

  if (!keyId) {
    throw new Error(
      "Razorpay is not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID in .env.local"
    );
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      amount: Math.round(opts.amountInRupees * 100),
      currency: "INR",
      name: "YourTube",
      description: opts.description,
      ...(orderId ? { order_id: orderId } : {}),
      prefill: {
        name: opts.name || "",
        email: opts.email || "",
      },
      theme: { color: "#dc2626" },
      handler: (response: any) => {
        resolve({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });
    rzp.open();
  });
};
