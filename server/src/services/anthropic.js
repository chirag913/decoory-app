import Anthropic from "@anthropic-ai/sdk";
import { rupeesToPaise } from "../utils/money.js";
import { rateFor, cityMultiplier } from "../config/rateCard.js";
import { brandsForRoomType, BRAND_INFO } from "../config/brands.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client = null;
if (process.env.ANTHROPIC_API_KEY) {
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const isAiConfigured = !!client;

// Rule-based fallback so the app fully works without ANTHROPIC_API_KEY.
const UPSELL_IDEAS = [
  {
    title: "Profile lighting upgrade",
    description: (stage) => `Warm LED profile lighting to complement the ${stage.toLowerCase()} work currently underway.`,
    priceNote: "From ₹18,500",
  },
  {
    title: "Premium hardware upgrade",
    description: () => "Soft-close hinges and heavy-duty channels on your cabinetry for a smoother, quieter daily feel.",
    priceNote: "From ₹12,000",
  },
  {
    title: "Smart storage solutions",
    description: () => "Magic corner units and pull-out organizers that make full use of every cabinet.",
    priceNote: "Quote on request",
  },
  {
    title: "Wallpaper & decor accents",
    description: () => "A curated accent wall to add character once the base finishes are complete.",
    priceNote: "From ₹9,500",
  },
];

// Returns { title, description, priceNote }. Uses Anthropic when configured,
// otherwise rotates through a small rate-card of ideas — avoids repeating
// whichever idea this project was suggested last.
export async function generateUpsellSuggestion({ project, materials, excludeTitles = [] }) {
  if (client) {
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `You are writing a short upsell suggestion card for an Indian interior design client app (Decoory Interior's). Project stage: "${project.currentStage || project.current_stage}". Materials already in use: ${materials.join(", ") || "none listed"}. Pick ONE idea from: profile lighting, premium hardware upgrade, smart storage, or wallpaper/decor accents. Do not repeat any of: ${excludeTitles.join(", ") || "none"}. Respond with ONLY minified JSON: {"title":"...","description":"...","priceNote":"..."}. Keep title under 6 words, description under 22 words, priceNote short like "From ₹18,500" or "Quote on request".`,
        }],
      });
      const text = msg.content.find((b) => b.type === "text")?.text?.trim();
      const parsed = JSON.parse(text);
      if (parsed.title && parsed.description) return parsed;
    } catch {
      // fall through to rule-based
    }
  }

  const available = UPSELL_IDEAS.filter((i) => !excludeTitles.includes(i.title));
  const idea = (available.length ? available : UPSELL_IDEAS)[Math.floor(Math.random() * (available.length ? available.length : UPSELL_IDEAS.length))];
  return {
    title: idea.title,
    description: idea.description(project.currentStage || project.current_stage || "your project"),
    priceNote: idea.priceNote,
  };
}

// Rule-based fallback for the public self-estimation tool. sizeSqft may be
// absent (e.g. "Full 3BHK" without a stated area) — falls back to a typical
// area per room type so the tool always returns a usable range.
const TYPICAL_SQFT = {
  "Modular kitchen": 120, "Living room": 220, "Master bedroom": 160,
  "Full 2BHK": 900, "Full 3BHK": 1300, "Full 4BHK+": 1900,
};

function ruleBasedEstimate({ roomType, sizeSqft, city }) {
  const rate = rateFor(roomType);
  const mult = cityMultiplier(city);
  const sqft = sizeSqft > 0 ? sizeSqft : (TYPICAL_SQFT[roomType] || 500);
  const low = Math.round(sqft * rate.low * mult / 1000) * 1000;
  const high = Math.round(sqft * rate.high * mult / 1000) * 1000;
  const brands = brandsForRoomType(roomType);

  return {
    estimateLowPaise: rupeesToPaise(low),
    estimateHighPaise: rupeesToPaise(high),
    materials: brands.map((b) => ({ brand: b, usedFor: BRAND_INFO[b].used_for })),
    brandSuggestions: brands,
    timeline: `${rate.weeks[0]}-${rate.weeks[1]} weeks from design freeze to handover`,
  };
}

// Returns { estimateLowPaise, estimateHighPaise, materials, brandSuggestions, timeline }.
export async function estimateBudget({ city, roomType, sizeSqft, statedBudget, stylePreferences }) {
  if (client) {
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `You are a budget estimator for Decoory Interior's, an Indian interior design company. A prospective client entered: city="${city}", room type="${roomType}", size=${sizeSqft ? sizeSqft + " sqft" : "not specified"}, their stated budget=${statedBudget ? "₹" + statedBudget : "not specified"}, style preferences="${stylePreferences || "none specified"}". Available material brands: Century Ply (plywood), Action TESA (laminates), Hafele (kitchen hardware), Hettich (drawer channels), Virgo (laminates/panels), Kwalit (paints). Estimate a realistic INR budget range for this scope in India. Respond with ONLY minified JSON in this exact shape: {"estimateLowRupees":number,"estimateHighRupees":number,"materials":[{"brand":"...","usedFor":"..."}],"brandSuggestions":["..."],"timeline":"e.g. 6-8 weeks from design freeze to handover"}. Pick materials only from the list above, 2-5 of them relevant to the room type.`,
        }],
      });
      const text = msg.content.find((b) => b.type === "text")?.text?.trim();
      const parsed = JSON.parse(text);
      if (parsed.estimateLowRupees && parsed.estimateHighRupees) {
        return {
          estimateLowPaise: rupeesToPaise(parsed.estimateLowRupees),
          estimateHighPaise: rupeesToPaise(parsed.estimateHighRupees),
          materials: parsed.materials || [],
          brandSuggestions: parsed.brandSuggestions || [],
          timeline: parsed.timeline || "6-10 weeks from design freeze to handover",
        };
      }
    } catch {
      // fall through to rule-based
    }
  }
  return ruleBasedEstimate({ roomType, sizeSqft, city });
}

export { client as anthropicClient, MODEL as anthropicModel };
