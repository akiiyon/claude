// Dates are plain 'YYYY-MM-DD' strings throughout; arithmetic is done in UTC so that
// the server's own time zone never shifts a day.

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s) {
  if (typeof s !== 'string' || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function todayIn(tz, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ISO weekday: 1 = Monday ... 7 = Sunday
export function isoWeekday(s) {
  const day = new Date(`${s}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function nextWorkday(s, workDays) {
  let d = addDays(s, 1);
  for (let i = 0; i < 7 && !workDays.includes(isoWeekday(d)); i++) d = addDays(d, 1);
  return d;
}

export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
