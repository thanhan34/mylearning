# PR2B.1 offline serialization contract

No application integration, Firebase instance, writes, rules/index deployment or migration.

## Codec v1

Flat ASCII payload with tagged, length-prefixed tokens: undefined/null/boolean,
UTF-16 hex strings, IEEE-754 big-endian hex numbers, dense arrays and sorted-key
plain objects. Null-prototype objects retain their prototype marker. Missing keys
are omitted; present undefined is an explicit token. NaN is canonicalized as a JS
NaN value (hidden NaN bit payloads are not part of this domain). Property descriptor
flags and shared reference identity are not preserved: value/own-presence semantics
only. Accessors, non-enumerable properties, symbols, cycles, sparse/decorated arrays,
bigints, functions and native/custom objects including SDK values are unsupported.
No getter is invoked during encoding. Unsupported input raises CodecError with
code/location; errors do not embed raw names, email, keys or text.

Objects sort keys by UTF-16 lexical order. SHA-256 hashes a versioned ASCII domain
prefix + schemaVersion + codecVersion + canonical payload. Unicode is not normalized.
The utilities require Node (Buffer/crypto), not browser execution. Own __proto__
keys are decoded through defineProperty without modifying the object's prototype.

Directory DTO duplicates query fields/grams outside the lossless payload and checks
they agree when decoded. This is a transport integrity check, not a replacement for
source-authoritative projection/reconciliation or an authenticated signature.

## Budgets

Default maxNodes=50000, max UTF-16 units including keys=250000, maxDepth=64.
Overrides require nonnegative safe integers. Violations fail without truncation.
Budgets bound codec work, not pre-existing input allocation or PR1 gram creation.
Preflight adds a configurable payload byte budget. Callers must validate original
input before creating PR1 grams in future integration.

## Storage

DTO is flat: ASCII scalar fields plus ASCII gram array; no nested arrays or undefined
reach the SDK serializer. Payload must be index-exempt in a future approved index
configuration. Storage estimates use UTF-8 string bytes+1, integer=8 and document
overhead=32, with supplied document name bytes. Index estimate is conservative and
includes field-path overhead; callers supply all array configurations and other
entry counts/bytes. It is not an exact wire/billing estimate. Preflight checks
document/field/entry/aggregate limits, never drops records or grams.

## Compatibility evidence and limits

Tests pass DTO through installed Google Firestore SDK validateUserInput/Serializer,
installed Firestore protobuf Document binary encode/decode, then codec decode.
Only local modules are loaded; no Firestore client or credentials are initialized.
Tests use SDK internal APIs and may need updating on SDK upgrades.

This proves local serialization round-trip, NOT server acceptance. Emulator tests
must cover set/get, max field/document sizes, oversized values and depth behavior.
Index enforcement/storage estimates still require separate validation against the
approved schema on a non-production environment. No such environment is accessed.

## Before PR2B.2

Approve serialization adapters or quarantine/fallback for unsupported native values,
input budgets and overflow behavior. Validate decoded model shape/business invariants
against source in the transaction core; directory types are not authorization.
Resolve payload duplication/storage overhead and index exemption configuration.
No silent skip, dual-write or writer changes are implemented by this PR.