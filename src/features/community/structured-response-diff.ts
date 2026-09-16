export type StructuredDiffSegmentKind = 'equal' | 'insert' | 'delete';

export interface StructuredDiffSegment {
  kind: StructuredDiffSegmentKind;
  text: string;
}

export interface StructuredDiffResult {
  original: StructuredDiffSegment[];
  corrected: StructuredDiffSegment[];
}

interface WordSegmenter {
  segment(input: string): Iterable<{ segment: string }>;
}

interface WordSegmenterConstructor {
  new (locales?: string | string[], options?: { granularity: 'word' }): WordSegmenter;
}

const MAX_EXACT_COMPARISON_CELLS = 4_000_000;

export function buildStructuredDiff(original: string, corrected: string): StructuredDiffResult {
  const originalTokens = tokenize(original);
  const correctedTokens = tokenize(corrected);
  if (original === corrected) {
    return {
      original: original ? [{ kind: 'equal', text: original }] : [],
      corrected: corrected ? [{ kind: 'equal', text: corrected }] : [],
    };
  }

  const operations = originalTokens.length * correctedTokens.length > MAX_EXACT_COMPARISON_CELLS
    ? coarseDiff(originalTokens, correctedTokens)
    : lcsDiff(originalTokens, correctedTokens);
  return toSideBySideResult(operations);
}

function tokenize(value: string): string[] {
  const segmenter = getWordSegmenter();
  if (segmenter) return [...segmenter.segment(value)].map((item) => item.segment);
  return value.match(/\s+|[\p{L}\p{M}\p{N}_]+|[^\s]/gu) ?? [];
}

function getWordSegmenter(): WordSegmenter | null {
  const constructor = (Intl as unknown as { Segmenter?: WordSegmenterConstructor }).Segmenter;
  return constructor ? new constructor(undefined, { granularity: 'word' }) : null;
}

type DiffOperation = StructuredDiffSegment;

function lcsDiff(original: string[], corrected: string[]): DiffOperation[] {
  const matrix = Array.from(
    { length: original.length + 1 },
    () => new Uint32Array(corrected.length + 1),
  );
  for (let originalIndex = original.length - 1; originalIndex >= 0; originalIndex -= 1) {
    for (let correctedIndex = corrected.length - 1; correctedIndex >= 0; correctedIndex -= 1) {
      matrix[originalIndex][correctedIndex] = original[originalIndex] === corrected[correctedIndex]
        ? matrix[originalIndex + 1][correctedIndex + 1] + 1
        : Math.max(matrix[originalIndex + 1][correctedIndex], matrix[originalIndex][correctedIndex + 1]);
    }
  }

  const operations: DiffOperation[] = [];
  let originalIndex = 0;
  let correctedIndex = 0;
  while (originalIndex < original.length || correctedIndex < corrected.length) {
    if (
      originalIndex < original.length &&
      correctedIndex < corrected.length &&
      original[originalIndex] === corrected[correctedIndex]
    ) {
      pushOperation(operations, { kind: 'equal', text: original[originalIndex] });
      originalIndex += 1;
      correctedIndex += 1;
      continue;
    }
    const keepOriginal = matrix[originalIndex + 1]?.[correctedIndex] ?? 0;
    const keepCorrected = matrix[originalIndex]?.[correctedIndex + 1] ?? 0;
    if (originalIndex < original.length && (correctedIndex >= corrected.length || keepOriginal >= keepCorrected)) {
      pushOperation(operations, { kind: 'delete', text: original[originalIndex] });
      originalIndex += 1;
    } else if (correctedIndex < corrected.length) {
      pushOperation(operations, { kind: 'insert', text: corrected[correctedIndex] });
      correctedIndex += 1;
    }
  }
  return operations;
}

function coarseDiff(original: string[], corrected: string[]): DiffOperation[] {
  let prefix = 0;
  while (prefix < original.length && prefix < corrected.length && original[prefix] === corrected[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < original.length - prefix &&
    suffix < corrected.length - prefix &&
    original[original.length - suffix - 1] === corrected[corrected.length - suffix - 1]
  ) suffix += 1;
  const operations: DiffOperation[] = [];
  for (let index = 0; index < prefix; index += 1) pushOperation(operations, { kind: 'equal', text: original[index] });
  for (let index = prefix; index < original.length - suffix; index += 1) {
    pushOperation(operations, { kind: 'delete', text: original[index] });
  }
  for (let index = prefix; index < corrected.length - suffix; index += 1) {
    pushOperation(operations, { kind: 'insert', text: corrected[index] });
  }
  for (let index = suffix; index > 0; index -= 1) {
    pushOperation(operations, { kind: 'equal', text: original[original.length - index] });
  }
  return operations;
}

function toSideBySideResult(operations: DiffOperation[]): StructuredDiffResult {
  const original: StructuredDiffSegment[] = [];
  const corrected: StructuredDiffSegment[] = [];
  for (const operation of operations) {
    if (operation.kind !== 'insert') pushOperation(original, operation);
    if (operation.kind !== 'delete') pushOperation(corrected, operation);
  }
  return { original, corrected };
}

function pushOperation(target: StructuredDiffSegment[], operation: StructuredDiffSegment): void {
  const previous = target[target.length - 1];
  if (previous?.kind === operation.kind) {
    previous.text += operation.text;
  } else if (operation.text) {
    target.push({ ...operation });
  }
}
