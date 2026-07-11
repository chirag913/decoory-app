// Indian-format money helpers. Amounts are stored in paise everywhere.

export function paiseToRupees(paise) {
  return paise / 100;
}

export function rupeesToPaise(rupees) {
  return Math.round(rupees * 100);
}

// ₹18.5L / ₹4.65L / ₹1.2Cr style, matching the prototype's microcopy.
export function formatINR(paise) {
  if (paise == null) return "—";
  const rupees = paiseToRupees(paise);
  const abs = Math.abs(rupees);
  let out;
  if (abs >= 1e7) out = `₹${trim((rupees / 1e7).toFixed(2))}Cr`;
  else if (abs >= 1e5) out = `₹${trim((rupees / 1e5).toFixed(2))}L`;
  else out = `₹${rupees.toLocaleString("en-IN")}`;
  return out;
}

// Strips at most one trailing hundredths zero ("18.50"->"18.5", "32.00"->"32.0")
// but always keeps one decimal place, matching the prototype's money microcopy.
function trim(numStr) {
  return numStr.endsWith("0") ? numStr.slice(0, -1) : numStr;
}
