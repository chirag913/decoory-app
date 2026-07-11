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
