// node:sqlite (unlike better-sqlite3) throws on `undefined` bound params —
// it only accepts null. Route handlers build param objects straight from
// req.body, where omitted fields are undefined, so normalize before binding.
export function normalizeParams(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === undefined ? null : v;
  return out;
}
