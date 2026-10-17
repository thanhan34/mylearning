import { isApproved, LearningAccount } from '../learning-access';

/** Runtime legacy values are intentionally not narrowed or repaired. Not a write DTO. */
export interface AccountSource {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  approvalStatus?: unknown;
  classId?: unknown;
  teacherId?: unknown;
  assignedFeedbackTypes?: unknown;
}
export type EffectiveApproval = 'approved' | 'pending';
export type AccountGroup = 'pending-student' | 'approved-student' | 'staff' | 'other';
export interface AccountView {
  id: string;
  name: unknown;
  email: unknown;
  role: unknown;
  approvalStatus: EffectiveApproval;
  assignedFeedbackTypes: unknown;
}
export interface CountContribution {
  total: number;
  students: number;
  pendingStudents: number;
  approvedStudents: number;
  staff: number;
  rawRejected: number;
  byRole: Record<string, number>;
  byRoleApproval: Record<string, number>;
}
export interface AccountDirectory {
  schemaVersion: 1;
  id: string;
  roleEffective: string;
  approvedEffective: boolean;
  approvalStatusEffective: EffectiveApproval;
  approvalStatusRawPresent: boolean;
  /** Tagged raw field avoids inventing a pending source value for absent fields. */
  approvalStatusRaw: { present: false } | { present: true; value: unknown };
  groupEffective: AccountGroup;
  view: AccountView;
  searchTextV1: string;
  searchGramsV1: string[];
  contribution: CountContribution;
}

export function effectiveApproval(source: AccountSource): EffectiveApproval {
  // Keep the existing function as the sole business oracle, including JS truthiness.
  return isApproved(source as LearningAccount) ? 'approved' : 'pending';
}
export function accountView(id: string, source: AccountSource): AccountView {
  return { id, email: source.email, name: source.name || '', role: source.role,
    approvalStatus: effectiveApproval(source), assignedFeedbackTypes: source.assignedFeedbackTypes || [] };
}
export function searchTextV1(view: AccountView): string {
  return `${view.name} ${view.email}`.toLowerCase();
}
export function matchesAccountSearch(view: AccountView, query: string): boolean {
  return searchTextV1(view).includes(query.toLowerCase());
}

/** Hex encodes UTF-16 units: lone surrogates never become lossy UTF-8 index values. */
export function gramKey(value: string): string {
  let hex = '';
  for (let i = 0; i < value.length; i++) hex += value.charCodeAt(i).toString(16).padStart(4, '0');
  return `${value.length}:${hex}`;
}
export function createSearchGrams(text: string): string[] {
  const grams = new Set<string>();
  for (let size = 1; size <= 3; size++) {
    for (let i = 0; i + size <= text.length; i++) grams.add(gramKey(text.slice(i, i + size)));
  }
  return [...grams].sort();
}
export function candidateGram(query: string): string | null {
  const lower = query.toLowerCase();
  return lower.length ? gramKey(lower.slice(0, Math.min(3, lower.length))) : null;
}
export function isSearchCandidate(directory: AccountDirectory, query: string): boolean {
  const gram = candidateGram(query);
  return gram === null || directory.searchGramsV1.includes(gram);
}
export function verifiedSearchMatch(directory: AccountDirectory, query: string): boolean {
  return isSearchCandidate(directory, query) && matchesAccountSearch(directory.view, query);
}

/** Tagged strings keep missing/null/literal markers distinct; safe for map keys. */
function roleKey(role: unknown): string {
  if (role === undefined) return 'missing';
  if (role === null) return 'null';
  if (typeof role === 'string') return `string:${gramKey(role)}`;
  throw new TypeError('Unsupported non-string role: report for review, do not coerce.');
}
export function countContribution(source: AccountSource): CountContribution {
  const role = roleKey(source.role), approval = effectiveApproval(source);
  const student = source.role === 'student', staff = ['teacher', 'assistant'].includes(source.role as string);
  return { total: 1, students: Number(student), pendingStudents: Number(student && approval !== 'approved'),
    approvedStudents: Number(student && approval === 'approved'), staff: Number(staff),
    rawRejected: Number(source.approvalStatus === 'rejected'),
    byRole: { [role]: 1 }, byRoleApproval: { [`${role}|${approval}`]: 1 } };
}
export function contributionDelta(before: CountContribution | null, after: CountContribution | null): CountContribution {
  const mapDelta = (old: Record<string, number> = {}, next: Record<string, number> = {}) => {
    const result: Record<string, number> = {};
    for (const key of new Set([...Object.keys(old), ...Object.keys(next)])) {
      const delta = (next[key] || 0) - (old[key] || 0);
      if (delta) result[key] = delta;
    }
    return result;
  };
  return { total: (after?.total || 0) - (before?.total || 0),
    students: (after?.students || 0) - (before?.students || 0),
    pendingStudents: (after?.pendingStudents || 0) - (before?.pendingStudents || 0),
    approvedStudents: (after?.approvedStudents || 0) - (before?.approvedStudents || 0),
    staff: (after?.staff || 0) - (before?.staff || 0),
    rawRejected: (after?.rawRejected || 0) - (before?.rawRejected || 0),
    byRole: mapDelta(before?.byRole, after?.byRole), byRoleApproval: mapDelta(before?.byRoleApproval, after?.byRoleApproval) };
}
export function projectAccount(id: string, source: AccountSource): AccountDirectory {
  const view = accountView(id, source), text = searchTextV1(view);
  const student = source.role === 'student';
  const present = Object.prototype.hasOwnProperty.call(source, 'approvalStatus');
  return { schemaVersion: 1, id, roleEffective: roleKey(source.role),
    approvedEffective: view.approvalStatus === 'approved', approvalStatusEffective: view.approvalStatus,
    approvalStatusRawPresent: present, approvalStatusRaw: present ? { present: true, value: source.approvalStatus } : { present: false },
    groupEffective: student ? view.approvalStatus === 'approved' ? 'approved-student' : 'pending-student'
      : ['teacher', 'assistant'].includes(source.role as string) ? 'staff' : 'other',
    view, searchTextV1: text, searchGramsV1: createSearchGrams(text), contribution: countContribution(source) };
}

/** Preflight only, not an exact Firestore storage calculator or permission to persist. */
export function assessIndexRisk(directory: AccountDirectory, arrayIndexConfigurations = 4, otherIndexEntries = 0) {
  if (!Number.isSafeInteger(arrayIndexConfigurations) || arrayIndexConfigurations < 0 ||
      !Number.isSafeInteger(otherIndexEntries) || otherIndexEntries < 0) throw new RangeError('Invalid index configuration count');
  const grams = directory.searchGramsV1.length;
  const estimatedIndexEntries = grams * arrayIndexConfigurations + otherIndexEntries;
  const serializedUtf8Bytes = new TextEncoder().encode(JSON.stringify(directory)).length;
  const warnings: string[] = [];
  if (estimatedIndexEntries > 40000) warnings.push('Estimated index entry count exceeds 40000.');
  if (serializedUtf8Bytes >= 1024 * 1024) warnings.push('Serialized projection reaches 1 MiB; Firestore document size must be calculated.');
  warnings.push('Exact document/index bytes, source payload and all index configurations require pre-write validation. No truncation performed.');
  return { grams, estimatedIndexEntries, serializedUtf8Bytes, warnings };
}