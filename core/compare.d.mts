export type RecordData = Record<string, unknown>;
export type Dataset = { columns: string[]; rows: RecordData[]; format: string };
export type Status = 'added' | 'removed' | 'modified' | 'unchanged';
export type CompareOptions = {
  keys?: string[];
  ignoreColumns?: string[];
  tolerance?: number | string;
  trimWhitespace?: boolean;
  ignoreCase?: boolean;
  strictTypes?: boolean;
};
export type ComparisonRow = {
  key: string;
  label: string;
  status: Status;
  before: RecordData | null;
  after: RecordData | null;
  changes: string[];
};
export type Report = {
  version: number;
  keys: string[];
  columns: string[];
  schema: { added: string[]; removed: string[] };
  summary: Record<Status, number> & { changedCells: number };
  options: Required<
    Pick<
      CompareOptions,
      'ignoreColumns' | 'trimWhitespace' | 'ignoreCase' | 'strictTypes'
    >
  > & { tolerance: number };
  rows: ComparisonRow[];
};
export const LIMITS: Readonly<{
  characters: number;
  rows: number;
  columns: number;
}>;
export function parseDataset(input: string, format?: string): Dataset;
export function parseDelimited(text: string, delimiter?: string): Dataset;
export function compareDatasets(
  before: Dataset,
  after: Dataset,
  options?: CompareOptions,
): Report;
export function suggestKey(before: Dataset, after: Dataset): string;
export function displayValue(value: unknown): string;
export function reportCsv(result: Report): string;
