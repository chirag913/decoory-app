// Rule-based budget estimator rate card — used when ANTHROPIC_API_KEY is
// absent (see services/anthropic.js estimateBudget). Rates are ₹/sqft.
export const ROOM_RATES = {
  "Modular kitchen": { low: 1400, high: 2200, weeks: [4, 6] },
  "Living room": { low: 900, high: 1500, weeks: [3, 5] },
  "Master bedroom": { low: 850, high: 1400, weeks: [3, 5] },
  "Full 2BHK": { low: 1100, high: 1800, weeks: [8, 11] },
  "Full 3BHK": { low: 1050, high: 1700, weeks: [10, 14] },
  "Full 4BHK+": { low: 1000, high: 1650, weeks: [14, 20] },
};
const DEFAULT_RATE = { low: 1000, high: 1700, weeks: [6, 10] };

// Mild cost-of-living / labor-rate adjustment for common NCR cities the
// prototype's leads come from. Unlisted cities use 1.0 (no adjustment).
export const CITY_MULTIPLIER = {
  Delhi: 1.08,
  Gurugram: 1.1,
  Noida: 1.0,
  Ghaziabad: 0.95,
};

export function rateFor(roomType) {
  return ROOM_RATES[roomType] || DEFAULT_RATE;
}

export function cityMultiplier(city) {
  return CITY_MULTIPLIER[city] || 1.0;
}
