import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import projectsRoutes from "./routes/projects.js";
import paymentsRoutes from "./routes/payments.js";
import leadsRoutes from "./routes/leads.js";
import teamRoutes from "./routes/team.js";
import notificationsRoutes from "./routes/notifications.js";
import documentsRoutes from "./routes/documents.js";
import suggestionsRoutes from "./routes/suggestions.js";
import reportsRoutes from "./routes/reports.js";
import uploadsRoutes from "./routes/uploads.js";
import devRoutes from "./routes/dev.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Local-disk fallback for uploads (see services/storage.js) — a no-op once
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are set, since uploads then return
// absolute Supabase Storage URLs instead of same-origin /uploads/* paths.
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/team-members", teamRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/suggestions", suggestionsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/uploads", uploadsRoutes);

// Time-travel / manual-trigger endpoints for exercising cron rules on
// demand — never mounted in production (see routes/dev.js).
if (process.env.NODE_ENV !== "production") {
  app.use("/api/dev", devRoutes);
}

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
