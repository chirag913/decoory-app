// Decoory's payment-coordination WhatsApp number. Online in-app checkout
// was removed by request — clients now message this number for a payment
// link instead. This is a plain wa.me deep link (no API, no credentials,
// no automated messages), not the "WhatsApp integration" the original
// spec excluded — that was about automated reminders, not a manual
// click-to-chat button.
export const DECOORY_WHATSAPP_NUMBER = "919821545511";

export function whatsappPaymentLink({ projectName, projectCode, label, amountText }) {
  const text = `Hi Decoory team, I'd like to pay for ${projectName} (${projectCode}) — ${label}, ${amountText}. Please share a payment link.`;
  return `https://wa.me/${DECOORY_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

// Admin-side: after publishing a daily update, open a chat with the client's
// own WhatsApp number (not Decoory's) so the admin can manually forward the
// news. Same manual wa.me pattern — no API, no automated send.
export function whatsappUpdateLink({ clientName, clientPhone, projectName, projectCode, items }) {
  const digits = (clientPhone || "").replace(/[^\d]/g, "");
  const bullet = items.map((it) => `• ${it}`).join("\n");
  const text = `Hi ${clientName}, here's today's update on ${projectName} (${projectCode}):\n\n${bullet}\n\nYou can view photos and full details in the Decoory app.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Sales Pipeline "Open WhatsApp" quick action — opens a chat with the
// lead's own number (WhatsApp field if set, else phone). Same manual
// wa.me pattern as above.
export function whatsappLeadLink({ leadName, phone }) {
  const digits = (phone || "").replace(/[^\d]/g, "");
  const text = `Hi ${leadName}, this is Decoory Interior's. `;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Client app's "Request a Callback" — after booking a slot in-app, this
// gives the client an optional one-tap way to also flag it on WhatsApp
// (the in-app request already notifies admins; this is just belt-and-braces
// since the client asked specifically for a WhatsApp confirmation too).
export function whatsappCallbackLink({ clientName, projectName, projectCode, label }) {
  const text = `Hi Decoory team, this is ${clientName}. I've requested a callback for ${label} regarding ${projectName} (${projectCode}). Please call me then!`;
  return `https://wa.me/${DECOORY_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
