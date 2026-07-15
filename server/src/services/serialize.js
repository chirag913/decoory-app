import db from "../db/index.js";

export function projectSummary(p) {
  const paidRow = db.prepare(
    "SELECT COALESCE(SUM(amount_paise),0) as paid FROM payments WHERE project_id = ? AND status = 'paid'"
  ).get(p.id);
  const materials = db.prepare("SELECT brand FROM materials WHERE project_id = ?").all(p.id).map((m) => m.brand);
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    type: p.type,
    clientUserId: p.client_user_id,
    budgetPaise: p.budget_paise,
    paidPaise: paidRow.paid,
    progressPct: p.progress_pct,
    currentStage: p.current_stage,
    startDate: p.start_date,
    handoverDate: p.handover_date,
    completedAt: p.completed_at,
    sourceLeadId: p.source_lead_id,
    health: p.health,
    todayPlan: p.today_plan,
    todayTeam: p.today_team,
    materials,
  };
}

export function projectDetail(p) {
  const client = db.prepare("SELECT id, name, email, phone FROM users WHERE id = ?").get(p.client_user_id);
  return { ...projectSummary(p), client };
}

export function milestone(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    done: !!row.done,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export function dailyUpdate(u) {
  const media = db.prepare("SELECT id, file_path, kind FROM update_media WHERE update_id = ?").all(u.id);
  return {
    id: u.id,
    projectId: u.project_id,
    date: u.update_date,
    items: JSON.parse(u.items),
    media: media.map((m) => ({ id: m.id, kind: m.kind, ...parsePlaceholder(m.file_path) })),
    createdAt: u.created_at,
  };
}

// Seed/demo media use a `placeholder://<hex1>-<hex2>?caption=...` scheme
// (see server/README "Media & seed photos"); real uploads (Phase 4) are
// served from /uploads/... and pass through unchanged.
function parsePlaceholder(filePath) {
  if (!filePath.startsWith("placeholder://")) return { url: filePath };
  const [colors, query] = filePath.replace("placeholder://", "").split("?");
  const [c1, c2] = colors.split("-").map((h) => `#${h}`);
  const caption = query ? decodeURIComponent(query.replace("caption=", "")) : "";
  return { placeholder: true, colors: [c1, c2], caption };
}

export function payment(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    amountPaise: row.amount_paise,
    dueAt: row.due_at,
    status: row.status,
    paidAt: row.paid_at,
    reminderSentAt: row.reminder_sent_at,
  };
}

export function teamMember(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    photoPath: row.photo_path,
    note: row.note,
  };
}

export function lead(row) {
  return {
    id: row.id,
    leadCode: row.lead_code,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    city: row.city,
    scope: row.scope,
    statedBudgetPaise: row.stated_budget_paise,
    aiEstimateLowPaise: row.ai_estimate_low_paise,
    aiEstimateHighPaise: row.ai_estimate_high_paise,
    expectedRevenuePaise: row.expected_revenue_paise,
    source: row.source,
    status: row.status,
    priority: row.priority,
    interestLevel: row.interest_level,
    leadOwner: row.lead_owner,
    requirements: row.requirements,
    notes: row.notes,
    tags: row.tags ? JSON.parse(row.tags) : [],
    searchData: row.search_data ? JSON.parse(row.search_data) : null,
    followUpAt: row.follow_up_at,
    siteVisitAt: row.site_visit_at,
    lastContactDate: row.last_contact_date,
    convertedProjectId: row.converted_project_id,
    lostReason: row.lost_reason,
    attemptCount: row.attempt_count,
    snoozedUntil: row.snoozed_until,
    snoozeReason: row.snooze_reason,
    createdAt: row.created_at,
  };
}

export function leadFile(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    filePath: row.file_path,
    fileName: row.file_name,
    kind: row.kind,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export function leadActivity(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    voidedAt: row.voided_at,
    voidedBy: row.voided_by,
  };
}

export function calendarEvent(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    eventDate: row.event_date,
    notes: row.notes,
    leadId: row.lead_id,
    projectId: row.project_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function message(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    senderUserId: row.sender_user_id,
    senderLabel: row.sender_label,
    text: row.text,
    attachmentPath: row.attachment_path,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function notification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type,
    data: row.data ? JSON.parse(row.data) : null,
    read: !!row.read,
    createdAt: row.created_at,
  };
}

export function suggestion(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    priceNote: row.price_note,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function material(row) {
  return { id: row.id, projectId: row.project_id, brand: row.brand, usedFor: row.used_for, tagline: row.tagline, infoUrl: row.info_url };
}

export function document(row) {
  const isUsp = row.section_key === "usp";
  return {
    id: row.id,
    key: row.section_key,
    title: row.title,
    body: isUsp ? JSON.parse(row.body) : row.body,
    updatedAt: row.updated_at,
  };
}
