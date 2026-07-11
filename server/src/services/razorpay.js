import Razorpay from "razorpay";
import crypto from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const client = KEY_ID && KEY_SECRET ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET }) : null;

export const isRazorpayConfigured = !!client;
export const razorpayKeyId = KEY_ID;

export async function createOrder({ amountPaise, receipt, notes }) {
  if (!client) return null;
  // Razorpay's `amount` is already in the smallest currency unit (paise for INR).
  return client.orders.create({ amount: amountPaise, currency: "INR", receipt, notes });
}

// Verifies the signature Checkout.js's success handler hands back client-side:
// HMAC-SHA256("<order_id>|<payment_id>", key_secret) must equal the signature.
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!KEY_SECRET || !orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return timingSafeEqualHex(expected, signature);
}

// Verifies the `X-Razorpay-Signature` header on webhook deliveries:
// HMAC-SHA256(<raw request body>, webhook_secret).
export function verifyWebhookSignature({ rawBody, signature }) {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  return timingSafeEqualHex(expected, signature);
}

function timingSafeEqualHex(a, b) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
