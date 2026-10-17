import type { AccountSource } from './directory';

export interface InputBudget { maxFieldUnits: number; maxSearchUnits: number; maxGramOccurrences: number }
export type InputCheck = { status: 'ready'; searchUnits: number; gramOccurrencesUpperBound: number }
  | { status: 'overflow' | 'unsupported'; code: string };
export const DEFAULT_INPUT_BUDGET: InputBudget = { maxFieldUnits: 4096, maxSearchUnits: 4096, maxGramOccurrences: 12285 };
/** Run BEFORE projectAccount. No grams, coercion of objects, getters, truncation or writes. */
export function precheckAccountInput(source: AccountSource, overrides: Partial<InputBudget> = {}): InputCheck {
  const budget = { ...DEFAULT_INPUT_BUDGET, ...overrides };
  if (Object.values(budget).some(n => !Number.isSafeInteger(n) || n < 0)) return { status: 'unsupported', code: 'INVALID_BUDGET' };
  if (!source || typeof source !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(source))) return { status: 'unsupported', code: 'SOURCE_PROTOTYPE' };
  let units = 1;
  for (const field of ['name', 'email'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(source, field);
    if (descriptor && !('value' in descriptor)) return { status: 'unsupported', code: 'ACCESSOR' };
    let value: unknown = descriptor?.value;
    if (field === 'name') value = value || '';
    if (value !== null && !['string', 'number', 'boolean', 'undefined'].includes(typeof value)) return { status: 'unsupported', code: 'SEARCH_COERCION_UNSUPPORTED' };
    const text = `${value}`;
    if (text.length > budget.maxFieldUnits) return { status: 'overflow', code: 'FIELD_UNITS' };
    // Native lowercasing can expand code units. Bound the field before doing it.
    units += text.toLowerCase().length;
  }
  if (units > budget.maxSearchUnits) return { status: 'overflow', code: 'SEARCH_UNITS' };
  const grams = units + Math.max(0, units - 1) + Math.max(0, units - 2);
  if (grams > budget.maxGramOccurrences) return { status: 'overflow', code: 'GRAM_WORK' };
  return { status: 'ready', searchUnits: units, gramOccurrencesUpperBound: grams };
}