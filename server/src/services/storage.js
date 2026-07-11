// File storage: Supabase Storage when configured, local disk otherwise.
// Both paths return the same shape so callers never branch on which is active.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuid } from "uuid";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "decoory-media";

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export function kindFromMimetype(mimetype) {
  if (mimetype?.startsWith("video/")) return "video";
  return "photo";
}

function safeExt(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

// Returns { url, kind } — url is an absolute Supabase public URL in prod,
// or a same-origin "/uploads/<file>" path served by express.static in dev.
export async function saveUpload({ buffer, originalName, mimetype }) {
  const kind = kindFromMimetype(mimetype);
  const filename = `${uuid()}${safeExt(originalName)}`;

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, { contentType: mimetype, upsert: false });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return { url: data.publicUrl, kind };
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return { url: `/uploads/${filename}`, kind };
}

export const isSupabaseConfigured = !!supabase;
