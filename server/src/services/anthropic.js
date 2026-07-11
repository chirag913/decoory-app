import Anthropic from "@anthropic-ai/sdk";

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

export { client as anthropicClient, MODEL as anthropicModel };
