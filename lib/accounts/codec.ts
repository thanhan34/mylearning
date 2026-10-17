import { createHash } from 'node:crypto';
import type { AccountDirectory } from './directory';

export class CodecError extends Error {
  constructor(public readonly code: 'UNSUPPORTED' | 'BUDGET' | 'INVALID_DTO', public readonly location: string) {
    super(`Account codec ${code} at ${location}`); this.name = 'CodecError';
  }
}
export interface CodecBudget { maxNodes: number; maxUnits: number; maxDepth: number }
export const DEFAULT_CODEC_BUDGET: CodecBudget = { maxNodes: 50000, maxUnits: 250000, maxDepth: 64 };
// Flat token payload avoids Firestore nested-array/map depth amplification.
export interface PersistedValueDTO { codecVersion: 1; payload: string }
export interface PersistedDirectoryDTO extends PersistedValueDTO {
  schemaVersion: 1;
  groupEffective: AccountDirectory['groupEffective'];
  roleEffective: string;
  approvalStatusEffective: AccountDirectory['approvalStatusEffective'];
  searchGramsV1: string[];
}
function budgetOptions(options: Partial<CodecBudget>): CodecBudget {
  const budget = { ...DEFAULT_CODEC_BUDGET, ...options };
  for (const value of Object.values(budget)) if (!Number.isSafeInteger(value) || value < 0) throw new CodecError('BUDGET', '$');
  return budget;
}
function hex(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) result += value.charCodeAt(i).toString(16).padStart(4, '0');
  return result;
}
function unhex(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i += 4) result += String.fromCharCode(parseInt(value.slice(i, i + 4), 16));
  return result;
}
export function encodeValue(value: unknown, options: Partial<CodecBudget> = {}): PersistedValueDTO {
  const budget = budgetOptions(options), active = new Set<object>();
  let nodes = 0, units = 0;
  function string(value: string): string {
    units += value.length;
    if (units > budget.maxUnits) throw new CodecError('BUDGET', '$');
    return `s${value.length}:${hex(value)}`;
  }
  function visit(value: unknown, depth: number): string {
    if (++nodes > budget.maxNodes || depth > budget.maxDepth) throw new CodecError('BUDGET', `$depth:${depth}`);
    if (value === undefined) return 'u';
    if (value === null) return 'n';
    if (typeof value === 'string') return string(value);
    if (typeof value === 'boolean') return value ? 't' : 'f';
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return 'd7ff8000000000000'; // Canonical JS NaN, not hidden payload bits.
      const bytes = Buffer.alloc(8); bytes.writeDoubleBE(value); return `d${bytes.toString('hex')}`;
    }
    if (typeof value !== 'object') throw new CodecError('UNSUPPORTED', `$depth:${depth}`);
    if (active.has(value)) throw new CodecError('UNSUPPORTED', '$cycle');
    const proto = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) throw new CodecError('UNSUPPORTED', '$prototype');
    const keys = Reflect.ownKeys(value);
    if (keys.some(key => typeof key === 'symbol')) throw new CodecError('UNSUPPORTED', '$symbol-key');
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!('value' in descriptor) || (!descriptor.enumerable && !(Array.isArray(value) && key === 'length'))) throw new CodecError('UNSUPPORTED', '$descriptor');
    }
    active.add(value);
    let result: string;
    if (Array.isArray(value)) {
      if (value.length > budget.maxNodes - nodes) throw new CodecError('BUDGET', '$array');
      if (keys.length !== value.length + 1 || !Array.from({ length: value.length }, (_, i) => Object.hasOwn(value, i)).every(Boolean)) {
        throw new CodecError('UNSUPPORTED', '$sparse-or-decorated-array');
      }
      result = `a${value.length}:` + value.map(item => visit(item, depth + 1)).join('');
    } else {
      const names = Object.keys(value).sort();
      if (names.length > budget.maxNodes - nodes) throw new CodecError('BUDGET', '$object');
      result = `${proto === null ? 'z' : 'o'}${names.length}:` + names.map(key => string(key) + visit(Object.getOwnPropertyDescriptor(value, key)!.value, depth + 1)).join('');
    }
    active.delete(value); return result;
  }
  return { codecVersion: 1, payload: visit(value, 0) };
}
export function decodeValue(dto: PersistedValueDTO, options: Partial<CodecBudget> = {}): unknown {
  const budget = budgetOptions(options);
  if (!dto || dto.codecVersion !== 1 || typeof dto.payload !== 'string') throw new CodecError('INVALID_DTO', '$version');
  const input = dto.payload;
  if (input.length > budget.maxUnits * 4 + budget.maxNodes * 32) throw new CodecError('BUDGET', '$payload');
  let offset = 0, nodes = 0, units = 0;
  const invalid = (): never => { throw new CodecError('INVALID_DTO', `$offset:${offset}`); };
  function count(): number {
    const end = input.indexOf(':', offset), raw = input.slice(offset, end);
    if (end < 0 || !/^(0|[1-9][0-9]*)$/.test(raw)) return invalid();
    offset = end + 1; const value = Number(raw);
    if (!Number.isSafeInteger(value)) return invalid(); return value;
  }
  function string(): string {
    const length = count(); units += length;
    if (units > budget.maxUnits) throw new CodecError('BUDGET', '$units');
    const value = input.slice(offset, offset + length * 4); offset += length * 4;
    if (value.length !== length * 4 || !/^[0-9a-f]*$/.test(value)) return invalid(); return unhex(value);
  }
  function visit(depth: number): unknown {
    if (++nodes > budget.maxNodes || depth > budget.maxDepth) throw new CodecError('BUDGET', '$nodes-depth');
    const tag = input[offset++];
    if (tag === 'u') return undefined;
    if (tag === 'n') return null;
    if (tag === 't') return true;
    if (tag === 'f') return false;
    if (tag === 's') return string();
    if (tag === 'd') {
      const bits = input.slice(offset, offset + 16); offset += 16;
      if (!/^[0-9a-f]{16}$/.test(bits)) return invalid(); return Buffer.from(bits, 'hex').readDoubleBE();
    }
    if (!['a', 'o', 'z'].includes(tag)) return invalid();
    const size = count();
    if (size > budget.maxNodes - nodes) throw new CodecError('BUDGET', '$container');
    if (tag === 'a') return Array.from({ length: size }, () => visit(depth + 1));
    const result = tag === 'z' ? Object.create(null) as Record<string, unknown> : {} as Record<string, unknown>;
    let previous: string | undefined;
    for (let i = 0; i < size; i++) {
      if (input[offset++] !== 's') return invalid();
      const key = string();
      if (previous !== undefined && key <= previous) return invalid(); previous = key;
      Object.defineProperty(result, key, { value: visit(depth + 1), enumerable: true, configurable: true, writable: true });
    }
    return result;
  }
  const result = visit(0);
  if (offset !== input.length) return invalid();
  // Reject alternate encodings including noncanonical NaN bits.
  if (encodeValue(result, budget).payload !== input) return invalid();
  return result;
}
export function canonicalHash(value: unknown, schemaVersion: number, options: Partial<CodecBudget> = {}): string {
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 0) throw new CodecError('INVALID_DTO', '$schema');
  return createHash('sha256').update(`accounts-canonical:1|schema:${schemaVersion}|codec:1|${encodeValue(value, options).payload}`, 'ascii').digest('hex');
}
export function encodeDirectory(directory: AccountDirectory, options: Partial<CodecBudget> = {}): PersistedDirectoryDTO {
  if (directory.schemaVersion !== 1) throw new CodecError('INVALID_DTO', '$schema');
  const dto: PersistedDirectoryDTO = { ...encodeValue(directory, options), schemaVersion: 1, groupEffective: directory.groupEffective,
    roleEffective: directory.roleEffective, approvalStatusEffective: directory.approvalStatusEffective,
    searchGramsV1: [...directory.searchGramsV1] };
  decodeDirectory(dto, options); return dto;
}
export function decodeDirectory(dto: PersistedDirectoryDTO, options: Partial<CodecBudget> = {}): AccountDirectory {
  if (!dto || Object.keys(dto).sort().join(',') !== 'approvalStatusEffective,codecVersion,groupEffective,payload,roleEffective,schemaVersion,searchGramsV1' ||
      !['pending-student', 'approved-student', 'staff', 'other'].includes(dto.groupEffective) ||
      !['pending', 'approved'].includes(dto.approvalStatusEffective) || typeof dto.roleEffective !== 'string' ||
      !/^[\x00-\x7f]*$/.test(dto.roleEffective) || !Array.isArray(dto.searchGramsV1) ||
      dto.searchGramsV1.some(g => typeof g !== 'string' || !/^(1:[0-9a-f]{4}|2:[0-9a-f]{8}|3:[0-9a-f]{12})$/.test(g))) throw new CodecError('INVALID_DTO', '$shape');
  const value = decodeValue(dto, options) as AccountDirectory;
  if (!value || value.schemaVersion !== 1 || dto.schemaVersion !== 1 ||
      value.groupEffective !== dto.groupEffective || value.roleEffective !== dto.roleEffective ||
      value.approvalStatusEffective !== dto.approvalStatusEffective ||
      encodeValue(value.searchGramsV1, options).payload !== encodeValue(dto.searchGramsV1, options).payload) throw new CodecError('INVALID_DTO', '$query-fields');
  return value;
}