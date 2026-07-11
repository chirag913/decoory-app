import { test } from "node:test";
import assert from "node:assert/strict";
import { isWithinReminderWindow, shouldSendUpcomingReminder, shouldSendOverdueReminder } from "./reminderWindow.js";

// All instants below are written with an explicit +05:30 offset so the test
// is independent of the machine's local timezone.
const ist = (s) => new Date(`2026-07-14T${s}+05:30`);

test("isWithinReminderWindow: 8:00 AM is in window (inclusive lower bound)", () => {
  assert.equal(isWithinReminderWindow(ist("08:00:00")), true);
});
test("isWithinReminderWindow: 7:59 AM is outside window", () => {
  assert.equal(isWithinReminderWindow(ist("07:59:59")), false);
});
test("isWithinReminderWindow: 7:59:59 PM is in window", () => {
  assert.equal(isWithinReminderWindow(ist("19:59:59")), true);
});
test("isWithinReminderWindow: 8:00 PM is outside window (exclusive upper bound)", () => {
  assert.equal(isWithinReminderWindow(ist("20:00:00")), false);
});
test("isWithinReminderWindow: midnight is outside window", () => {
  assert.equal(isWithinReminderWindow(ist("00:00:00")), false);
});

test("shouldSendUpcomingReminder: due in 8 hours, 10 AM IST -> true", () => {
  const now = ist("10:00:00");
  const dueAt = "2026-07-14T18:00:00+05:30"; // 8 hours later
  assert.equal(shouldSendUpcomingReminder({ dueAt, reminderSentAt: null, now }), true);
});

test("shouldSendUpcomingReminder: due in exactly 6 hours -> true (inclusive lower bound)", () => {
  const now = ist("12:00:00");
  const dueAt = "2026-07-14T18:00:00+05:30";
  assert.equal(shouldSendUpcomingReminder({ dueAt, reminderSentAt: null, now }), true);
});

test("shouldSendUpcomingReminder: due in exactly 10 hours -> true (inclusive upper bound)", () => {
  const now = ist("08:00:00");
  const dueAt = "2026-07-14T18:00:00+05:30";
  assert.equal(shouldSendUpcomingReminder({ dueAt, reminderSentAt: null, now }), true);
});

test("shouldSendUpcomingReminder: due in 5 hours -> false (too soon)", () => {
  const now = ist("13:00:00");
  const dueAt = "2026-07-14T18:00:00+05:30";
  assert.equal(shouldSendUpcomingReminder({ dueAt, reminderSentAt: null, now }), false);
});

test("shouldSendUpcomingReminder: due in 11 hours -> false (too early)", () => {
  const now = ist("07:00:00");
  const dueAt = "2026-07-14T18:00:00+05:30";
  assert.equal(shouldSendUpcomingReminder({ dueAt, reminderSentAt: null, now }), false);
});

test("shouldSendUpcomingReminder: in due-range but 9 PM (outside window) -> false", () => {
  const now = ist("21:00:00"); // 9 PM
  const dueAt = "2026-07-15T04:00:00+05:30"; // 7 hours later
  assert.equal(shouldSendUpcomingReminder({ dueAt, reminderSentAt: null, now }), false);
});

test("shouldSendUpcomingReminder: never re-sends once reminder_sent_at is set", () => {
  const now = ist("10:00:00");
  const dueAt = "2026-07-14T18:00:00+05:30";
  assert.equal(shouldSendUpcomingReminder({ dueAt, reminderSentAt: "2026-07-14T09:00:00+05:30", now }), false);
});

test("shouldSendOverdueReminder: fires at 10 AM if never sent", () => {
  assert.equal(shouldSendOverdueReminder({ now: ist("10:00:00"), reminderSentAt: null }), true);
});
test("shouldSendOverdueReminder: fires anywhere within the 10 AM hour", () => {
  assert.equal(shouldSendOverdueReminder({ now: ist("10:59:00"), reminderSentAt: null }), true);
});
test("shouldSendOverdueReminder: does not fire in adjacent hours", () => {
  assert.equal(shouldSendOverdueReminder({ now: ist("09:59:00"), reminderSentAt: null }), false);
  assert.equal(shouldSendOverdueReminder({ now: ist("11:00:00"), reminderSentAt: null }), false);
});
test("shouldSendOverdueReminder: does not re-fire same IST day", () => {
  assert.equal(shouldSendOverdueReminder({ now: ist("10:30:00"), reminderSentAt: "2026-07-14T10:00:00+05:30" }), false);
});
test("shouldSendOverdueReminder: fires again on a new IST day", () => {
  assert.equal(shouldSendOverdueReminder({ now: ist("10:30:00"), reminderSentAt: "2026-07-13T10:00:00+05:30" }), true);
});
