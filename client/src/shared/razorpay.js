// Lazily loads Razorpay's Checkout.js (only when a payment is actually
// attempted) and opens it for one order. Resolves with the signed
// {razorpay_payment_id, razorpay_order_id, razorpay_signature} triple on
// success — the caller still has to POST that to /payments/:id/verify,
// since Checkout.js's own "success" callback is not proof of payment.
let scriptPromise = null;

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load the secure checkout — check your connection and try again."));
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export async function openRazorpayCheckout({ order, keyId, payment, user }) {
  await loadCheckoutScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: "Decoory Interior's",
      description: payment.label,
      prefill: { name: user?.name, email: user?.email, contact: user?.phone },
      theme: { color: "#1E2622" },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.on("payment.failed", (resp) => reject(new Error(resp.error?.description || "Payment failed")));
    rzp.open();
  });
}
