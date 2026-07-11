// Single source of truth for the six brands Decoory installs — used by the
// seed script, and by the rule-based estimator's material/brand suggestions.
export const BRAND_INFO = {
  "Century Ply": { used_for: "BWP plywood — kitchen & wardrobes", tagline: "Waterproof · 8-yr warranty" },
  "Action TESA": { used_for: "Laminates & veneer finishes", tagline: "Premium laminates" },
  "Hafele": { used_for: "Kitchen hardware & soft-close hinges", tagline: "German engineering" },
  "Hettich": { used_for: "Drawer channels & sliding systems", tagline: "50,000-cycle tested" },
  "Virgo": { used_for: "Laminates — living room panels", tagline: "Scratch resistant" },
  "Kwalit": { used_for: "Interior wall paints & finishes", tagline: "Trusted paint finishes" },
};

// Which brands typically show up for a given room type, most relevant first.
export const ROOM_BRAND_MAP = {
  "Modular kitchen": ["Century Ply", "Hafele", "Hettich"],
  "Living room": ["Virgo", "Action TESA", "Kwalit"],
  "Master bedroom": ["Century Ply", "Virgo", "Kwalit"],
  "Full 2BHK": ["Century Ply", "Hafele", "Virgo", "Kwalit"],
  "Full 3BHK": ["Century Ply", "Hafele", "Hettich", "Virgo", "Kwalit"],
  "Full 4BHK+": ["Century Ply", "Hafele", "Hettich", "Virgo", "Action TESA", "Kwalit"],
};

export function brandsForRoomType(roomType) {
  return ROOM_BRAND_MAP[roomType] || ["Century Ply", "Hafele", "Kwalit"];
}
