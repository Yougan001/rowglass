'use client';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { compareDatasets, displayValue, reportCsv } from '@/core/compare.mjs';
type Report = ReturnType<typeof compareDatasets>;
export function Results({ report }: { report: Report }) {
  const [filter, setFilter] = useState('changes'),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [onlyColumns, setOnlyColumns] = useState(false),
    [notice, setNotice] = useState('');
  const filtered = useMemo(
    () =>
      report.rows.filter(
        (row) =>
          (filter === 'all' ||
            (filter === 'changes'
              ? row.status !== 'unchanged'
              : row.status === filter)) &&
          (!query ||
            Object.values(row.before ?? {})
              .concat(Object.values(row.after ?? {}))
              .some((v) =>
                displayValue(v).toLowerCase().includes(query.toLowerCase()),
              )),
      ),
    [report, filter, query],
  );
  const changedColumns = useMemo(
    () => new Set(report.rows.flatMap((r) => r.changes)),
    [report],
  );
  const columns = report.columns.filter(
    (c) => !onlyColumns || report.keys.includes(c) || changedColumns.has(c),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, totalPages - 1),
    visible = filtered.slice(currentPage * 50, (currentPage + 1) * 50);
  function download(kind: 'csv' | 'json') {
    const text =
      kind === 'csv' ? reportCsv(report) : JSON.stringify(report, null, 2);
    const url = URL.createObjectURL(
      new Blob([text], {
        type: kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `rowglass-report.${kind}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setNotice(
      kind === 'csv'
        ? 'CSV exported: all changed fields, regardless of filters.'
        : 'JSON exported: all records and comparison options.',
    );
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `Rowglass comparison\nMatched by: ${report.keys.join(' + ')}\n${report.summary.added} added, ${report.summary.removed} removed, ${report.summary.modified} modified, ${report.summary.unchanged} unchanged.\n${report.summary.changedCells} changed cells in matched records.\nSchema: ${report.schema.added.length} added columns, ${report.schema.removed.length} removed columns.`,
      );
      setNotice('Summary copied.');
    } catch {
      setNotice('Clipboard is unavailable. Use Export JSON instead.');
    }
  }
  return (
    <section className="results" aria-label="Comparison results">
      <div className="results-heading">
        <div>
          <span className="eyebrow">COMPARISON COMPLETE</span>
          <h2>A clearer view of every change</h2>
        </div>
        <div className="export-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy comparison summary"
            onClick={copy}
          >
            <Copy />
          </Button>
          <Button
            variant="outline"
            className="action-button"
            onClick={() => download('json')}
          >
            JSON
          </Button>
          <Button
            variant="outline"
            className="action-button"
            onClick={() => download('csv')}
          >
            <Download />
            Export CSV
          </Button>
        </div>
      </div>
      <div className="summary-grid">
        {(['modified', 'added', 'removed', 'unchanged'] as const).map(
          (status) => (
            <div key={status} className={'summary-card ' + status}>
              <span className="summary-label">
                <i />
                {status}
              </span>
              <strong>{report.summary[status].toLocaleString()}</strong>
              <span>
                {status === 'modified'
                  ? `${report.summary.changedCells.toLocaleString()} cells changed`
                  : status === 'unchanged'
                    ? 'Matched and identical'
                    : `Records ${status}`}
              </span>
            </div>
          ),
        )}
      </div>
      {(report.schema.added.length > 0 || report.schema.removed.length > 0) && (
        <output className="schema-notice">
          <strong>Column changes</strong>
          {report.schema.added.map((c) => (
            <span className="added" key={'+' + c}>
              + {c}
            </span>
          ))}
          {report.schema.removed.map((c) => (
            <span className="removed" key={'-' + c}>
              − {c}
            </span>
          ))}
        </output>
      )}
      <div className="result-tools">
        <Tabs
          value={filter}
          onValueChange={(v) => {
            setFilter(String(v));
            setPage(0);
          }}
        >
          <TabsList aria-label="Filter records">
            {[
              'changes',
              'modified',
              'added',
              'removed',
              'unchanged',
              'all',
            ].map((v) => (
              <TabsTrigger value={v} key={v}>
                {v === 'changes' ? 'All changes' : v}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <label className="result-search">
          <Search size={16} />
          <input
            aria-label="Search comparison results"
            placeholder="Search records…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      <div className="table-options">
        <label htmlFor="changed-columns-only">
          <Checkbox
            id="changed-columns-only"
            checked={onlyColumns}
            onCheckedChange={(v) => setOnlyColumns(!!v)}
          />
          Changed columns only
        </label>
        <span>{filtered.length.toLocaleString()} matching records</span>
      </div>
      <div className="table-frame">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Change</TableHead>
              {columns.map((c) => (
                <TableHead scope="col" key={c}>
                  {c}
                  {report.keys.includes(c) && (
                    <span className="key-marker">KEY</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <span className={'status-badge ' + row.status}>
                    {row.status}
                  </span>
                </TableCell>
                {columns.map((c) => (
                  <TableCell key={c}>
                    {row.status === 'modified' && row.changes.includes(c) ? (
                      <span className="cell-change">
                        <del
                          aria-label={
                            'Before: ' + displayValue(row.before?.[c])
                          }
                        >
                          {displayValue(row.before?.[c])}
                        </del>
                        <ArrowRight size={13} />
                        <ins
                          aria-label={'After: ' + displayValue(row.after?.[c])}
                        >
                          {displayValue(row.after?.[c])}
                        </ins>
                      </span>
                    ) : (
                      <span className="cell-value">
                        {displayValue((row.after ?? row.before)?.[c])}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!visible.length && (
          <div className="no-matches">
            <Check size={25} />
            <h3>
              {query
                ? 'No records match your search.'
                : filter === 'changes'
                  ? 'No changed records.'
                  : `No ${filter} records.`}
            </h3>
            <p>
              {report.schema.added.length + report.schema.removed.length
                ? 'Column changes are listed above.'
                : 'Try another filter, or compare different data.'}
            </p>
          </div>
        )}
      </div>
      <div className="results-footer">
        <span>
          {filtered.length
            ? `${currentPage * 50 + 1}–${Math.min((currentPage + 1) * 50, filtered.length)} of ${filtered.length.toLocaleString()}`
            : '0 records'}{' '}
          · matched by <code>{report.keys.join(' + ')}</code>
        </span>
        <Pagination className="pager">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous results page"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span>
                Page {currentPage + 1} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next results page"
                disabled={currentPage + 1 >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      {notice && <output className="export-notice">{notice}</output>}
    </section>
  );
}
