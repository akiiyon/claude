// Keep in step with src/validate.js.
export const STAGES = ['Proposal', 'PFR', 'DPR', 'Detailed Engineering', 'Fabrication', 'Construction Support', 'Other'];
export const PROJECT_STATUSES = ['Not started', 'In progress', 'On hold', 'Under review', 'Completed'];
export const PRIORITIES = ['High', 'Medium', 'Low'];
export const ASSIGNMENT_STATUSES = ['Not started', 'In progress', 'On hold', 'Done'];
export const REVISION_STATUSES = ['In preparation', 'Submitted', 'Under review', 'Approved', 'Approved with comments', 'Revise & resubmit', 'Rejected'];

export const asOptions = (list, blankLabel) => [...(blankLabel !== undefined ? [['', blankLabel]] : []), ...list.map((v) => [v, v])];
export const userOptions = (users, blankLabel) => [...(blankLabel !== undefined ? [['', blankLabel]] : []), ...users.map((u) => [u.id, u.name])];
