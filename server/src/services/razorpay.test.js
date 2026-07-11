import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// razorpay.js reads env vars at import time, so set them before the dynamic
// import — a plain top-level `import` would run before this test file's
// module-scope code gets a chance to set process.env.
process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";

const { verifyPaymentSignature, verifyWebhookSignature, isRazorpayConfigured } = await import("./razorpay.js");

test("isRazorpayConfigured is true once key id/secret are set", () => {
  assert.equal(isRazorpayConfigured, true);
});

test("verifyPaymentSignature accepts a correctly-signed order/payment pair", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";
  const signature = crypto.createHmac("sha256", "test_key_secret").update(`${orderId}|${paymentId}`).digest("hex");
  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature }), true);
});

test("verifyPaymentSignature rejects a tampered signature", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";
  const signature = crypto.createHmac("sha256", "wrong_secret").update(`${orderId}|${paymentId}`).digest("hex");
  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature }), false);
});

test("verifyPaymentSignature rejects a signature for a different payment id (replay attempt)", () => {
  const orderId = "order_ABC123";
  const signature = crypto.createHmac("sha256", "test_key_secret").update(`${orderId}|pay_ORIGINAL`).digest("hex");
  assert.equal(verifyPaymentSignature({ orderId, paymentId: "pay_DIFFERENT", signature }), false);
});

test("verifyPaymentSignature rejects missing fields", () => {
  assert.equal(verifyPaymentSignature({ orderId: "o1", paymentId: "p1", signature: "" }), false);
  assert.equal(verifyPaymentSignature({ orderId: "", paymentId: "p1", signature: "abc" }), false);
});

test("verifyWebhookSignature accepts a correctly-signed raw body", () => {
  const rawBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });
  const signature = crypto.createHmac("sha256", "test_webhook_secret").update(rawBody).digest("hex");
  assert.equal(verifyWebhookSignature({ rawBody, signature }), true);
});

test("verifyWebhookSignature rejects a body that doesn't match the signature", () => {
  const rawBody = JSON.stringify({ event: "payment.captured" });
  const signature = crypto.createHmac("sha256", "test_webhook_secret").update(rawBody + "tampered").digest("hex");
  assert.equal(verifyWebhookSignature({ rawBody, signature }), false);
});
