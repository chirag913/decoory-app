import db from "../db/index.js";

// A project's progress_pct is derived from its milestones once any exist —
// called after every milestone create/toggle/delete. Projects with zero
// milestones keep whatever progress_pct they already had (e.g. seed data
// or a project that hasn't adopted milestones yet).
export function recomputeProgress(projectId) {
  const row = db.prepare(
    "SELECT COUNT(*) as total, COALESCE(SUM(done), 0) as doneCount FROM milestones WHERE project_id = ?"
  ).get(projectId);
  if (row.total === 0) return;
  const pct = Math.round((row.doneCount / row.total) * 100);
  db.prepare("UPDATE projects SET progress_pct = ? WHERE id = ?").run(pct, projectId);
}
