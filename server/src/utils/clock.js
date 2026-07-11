// In-memory clock offset so the scheduler's 8AM / reminder-window rules can be
// tested by fast-forwarding time via the dev-only /api/dev/time endpoint,
// without waiting for real wall-clock time to pass.

let offsetMs = 0;

export function now() {
  return new Date(Date.now() + offsetMs);
}

export function setOffsetMs(ms) {
  offsetMs = ms;
}

export function advanceMs(ms) {
  offsetMs += ms;
  return offsetMs;
}

export function resetOffset() {
  offsetMs = 0;
}

export function getOffsetMs() {
  return offsetMs;
}
