// Razorpay via raw REST + WebCrypto — replaces the Node SDK.

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export const createRazorpayOrder = async (
  keyId: string,
  keySecret: string,
  params: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  },
): Promise<RazorpayOrder> => {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${body}`);
  }
  return res.json<RazorpayOrder>();
};

/** Timing-safe HMAC-SHA256 verification of Razorpay's payment signature. */
export const verifyRazorpaySignature = async (
  keySecret: string,
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  // Razorpay signatures are lowercase hex
  const sigBytes = new Uint8Array(signature.length / 2);
  if (signature.length % 2 !== 0) return false;
  for (let i = 0; i < sigBytes.length; i++) {
    const byte = parseInt(signature.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return false;
    sigBytes[i] = byte;
  }
  // crypto.subtle.verify is constant-time
  return crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes as BufferSource,
    new TextEncoder().encode(`${orderId}|${paymentId}`),
  );
};
