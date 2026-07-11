// Payment reminder business rules (all times evaluated in Asia/Kolkata):
//
// Upcoming payments: send when due in 6-10 hours AND current IST time is
//   within [08:00, 20:00). Never send outside that window. Fires once
//   (caller must persist reminder_sent_at after a true result).
// Overdue payments: send once daily at the 10:00 IST hour.

const IST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
});

// Returns { dateStr: "YYYY-MM-DD", hour: 0-23 } for the given instant, in IST.
export function istParts(date) {
  const parts = IST_FORMATTER.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0; // some ICU impls emit "24" for midnight
  return { dateStr: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

export function isWithinReminderWindow(date) {
  const { hour } = istParts(date);
  return hour >= 8 && hour < 20;
}

export function hoursUntil(dueAt, now) {
  return (new Date(dueAt).getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function shouldSendUpcomingReminder({ dueAt, reminderSentAt, now }) {
  if (reminderSentAt) return false; // already fired once
  if (!isWithinReminderWindow(now)) return false;
  const hrs = hoursUntil(dueAt, now);
  return hrs >= 6 && hrs <= 10;
}

export function shouldSendOverdueReminder({ now, reminderSentAt }) {
  const { dateStr, hour } = istParts(now);
  if (hour !== 10) return false;
  if (!reminderSentAt) return true;
  const sentDateStr = istParts(new Date(reminderSentAt)).dateStr;
  return sentDateStr !== dateStr; // one per calendar day (IST)
}
