import { isIsoDate } from './dates.js';

export const STAGES = ['Proposal', 'PFR', 'DPR', 'Detailed Engineering', 'Fabrication', 'Construction Support', 'Other'];
export const PROJECT_STATUSES = ['Not started', 'In progress', 'On hold', 'Under review', 'Completed'];
export const PRIORITIES = ['High', 'Medium', 'Low'];
export const ASSIGNMENT_STATUSES = ['Not started', 'In progress', 'On hold', 'Done'];
export const REVISION_STATUSES = ['In preparation', 'Submitted', 'Under review', 'Approved', 'Approved with comments', 'Revise & resubmit', 'Rejected'];

export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Reads the listed fields from body. Each rule: {type, required, max, oneOf, label}.
// With partial, fields missing from body are skipped, so one rule set serves create and update.
export function pick(body, rules, { partial = false } = {}) {
  const src = body && typeof body === 'object' ? body : {};
  const out = {};
  for (const [key, rule] of Object.entries(rules)) {
    const label = rule.label || key;
    if (!(key in src)) {
      if (rule.required && !partial) throw new InputError(`${label} is required.`);
      continue;
    }
    let v = src[key];
    if (typeof v === 'string' && rule.type !== 'text' && v.trim() === '') v = null;
    if (v === undefined) v = null;
    if (v === null) {
      if (rule.required) throw new InputError(`${label} is required.`);
      out[key] = null;
      continue;
    }
    switch (rule.type) {
      case 'text': {
        if (typeof v !== 'string') throw new InputError(`${label} must be text.`);
        v = v.trim();
        if (!v) {
          if (rule.required) throw new InputError(`${label} is required.`);
          v = null;
        } else if (v.length > (rule.max || 200)) {
          throw new InputError(`${label} must be at most ${rule.max || 200} characters.`);
        }
        break;
      }
      case 'date':
        if (!isIsoDate(v)) throw new InputError(`${label} must be a date (YYYY-MM-DD).`);
        break;
      case 'id':
        v = Number(v);
        if (!Number.isInteger(v) || v <= 0) throw new InputError(`${label} is not valid.`);
        break;
      case 'bool':
        if (typeof v !== 'boolean') throw new InputError(`${label} must be true or false.`);
        v = v ? 1 : 0;
        break;
      default:
        throw new Error(`Unknown rule type ${rule.type}`);
    }
    if (rule.oneOf && v !== null && !rule.oneOf.includes(v)) {
      throw new InputError(`${label} must be one of: ${rule.oneOf.join(', ')}.`);
    }
    out[key] = v;
  }
  return out;
}

export function requireId(value, label = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new InputError(`${label} is not valid.`, 404);
  return n;
}

// Builds "SET a = :a, b = :b" from the keys of a picked object.
export function setClause(fields) {
  return Object.keys(fields).map((k) => `${k} = :${k}`).join(', ');
}
