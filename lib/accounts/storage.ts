import { CodecError, decodeDirectory, PersistedDirectoryDTO } from './codec';

export interface IndexConfiguration {
  /** Each configuration models one array index containing grams and listed scalar fields. */
  arrayIndexes: { scalarFields: ('roleEffective' | 'groupEffective' | 'approvalStatusEffective')[] }[];
  otherEntries: number;
  otherIndexBytes: number;
  documentNameBytes: number;
  parentDocumentNameBytes: number;
  /** Applied before decode/preflight allocation, not a truncation policy. */
  maxPayloadBytes: number;
}
export function storagePreflight(dto: PersistedDirectoryDTO, config: IndexConfiguration) {
  for (const number of [config.otherEntries, config.otherIndexBytes, config.documentNameBytes, config.parentDocumentNameBytes, config.maxPayloadBytes]) {
    if (!Number.isSafeInteger(number) || number < 0) throw new CodecError('INVALID_DTO', '$index-config');
  }
  if (typeof dto.payload !== 'string' || Buffer.byteLength(dto.payload, 'utf8') > config.maxPayloadBytes) throw new CodecError('BUDGET', '$payload-bytes');
  decodeDirectory(dto);
  const issues: string[] = [];
  const stringSize = (s: string) => Buffer.byteLength(s, 'utf8') + 1;
  const scalar = ['groupEffective', 'roleEffective', 'approvalStatusEffective'] as const;
  for (const field of scalar) if (!/^[\x00-\x7f]*$/.test(dto[field])) throw new CodecError('UNSUPPORTED', '$non-ascii-query-field');
  if (!/^[\x00-\x7f]*$/.test(dto.payload) || dto.searchGramsV1.some(s => !/^[123]:[0-9a-f]+$/.test(s))) throw new CodecError('INVALID_DTO', '$payload-grams');
  // Firestore documented storage convention: names/string UTF-8 bytes +1,
  // int64 8 bytes, document overhead 32. Flat DTO depth is <=2.
  const sizes: Record<string, number> = { codecVersion: 8, schemaVersion: 8,
    payload: stringSize(dto.payload), groupEffective: stringSize(dto.groupEffective),
    roleEffective: stringSize(dto.roleEffective), approvalStatusEffective: stringSize(dto.approvalStatusEffective),
    searchGramsV1: dto.searchGramsV1.reduce((sum, gram) => sum + stringSize(gram), 0) };
  const estimatedDocumentBytes = config.documentNameBytes + 32 + Object.entries(sizes).reduce((sum, [key, size]) => sum + stringSize(key) + size, 0);
  const estimatedIndexEntries = config.otherEntries + config.arrayIndexes.length * dto.searchGramsV1.length;
  let estimatedIndexBytes = config.otherIndexBytes;
  let maxIndexEntryBytes = 0;
  for (const index of config.arrayIndexes) {
    const scalarBytes = index.scalarFields.reduce((sum, field) => {
      if (!scalar.includes(field)) throw new CodecError('INVALID_DTO', '$index-field');
      if (sizes[field] > 1500) issues.push('Indexed scalar exceeds 1500 bytes; query cannot be trusted without redesign.');
      return sum + sizes[field];
    }, 0);
    for (const gram of dto.searchGramsV1) {
      // Conservative collection-scope estimate, including field-path overhead.
      const bytes = config.documentNameBytes + config.parentDocumentNameBytes + 32 + scalarBytes + stringSize(gram)
        + stringSize('searchGramsV1') + index.scalarFields.reduce((sum, f) => sum + stringSize(f), 0);
      maxIndexEntryBytes = Math.max(maxIndexEntryBytes, bytes); estimatedIndexBytes += bytes;
    }
  }
  if (estimatedDocumentBytes > 1048576) issues.push('Document estimate exceeds 1 MiB.');
  if (sizes.payload > 1048487) issues.push('Payload exceeds maximum field value 1 MiB minus 89 bytes.');
  if (estimatedIndexEntries > 40000) issues.push('Index entry count exceeds 40000.');
  if (estimatedIndexBytes > 8 * 1048576) issues.push('Index byte estimate exceeds 8 MiB.');
  if (maxIndexEntryBytes > 7680) issues.push('Index entry estimate exceeds 7.5 KiB.');
  return { estimatedDocumentBytes, payloadUtf8Bytes: sizes.payload - 1, grams: dto.searchGramsV1.length,
    estimatedIndexEntries, estimatedIndexBytes, maxIndexEntryBytes, issues,
    readyForEmulatorValidation: issues.length === 0,
    assumptions: 'Payload must be index-exempt. All array indexes and remaining scalar entries/bytes must be supplied. Estimates are not protobuf size, billed storage or permission to write.' };
}