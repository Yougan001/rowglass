'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  CodeXml,
  ShieldCheck,
  FlaskConical,
  SlidersHorizontal,
  Moon,
  Sun,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SourceInput } from '@/components/source-input';
import { Results } from '@/components/results';
import { parseDataset, compareDatasets } from '@/core/compare.mjs';
import { useComparison } from '@/hooks/use-comparison';
import { DEMO_BEFORE, DEMO_AFTER } from '@/lib/demo';

type Report = ReturnType<typeof compareDatasets>;
const defaultOptions = {
  trimWhitespace: false,
  ignoreCase: false,
  strictTypes: false,
  tolerance: '0',
  ignoreColumns: [] as string[],
};
const initialReport = compareDatasets(
  parseDataset(DEMO_BEFORE),
  parseDataset(DEMO_AFTER),
  { keys: ['sku'] },
);

export default function App() {
  const [left, setLeft] = useState(DEMO_BEFORE),
    [right, setRight] = useState(DEMO_AFTER);
  const [leftName, setLeftName] = useState('Sample · catalog-before.csv'),
    [rightName, setRightName] = useState('Sample · catalog-after.csv');
  const [leftFormat, setLeftFormat] = useState('auto'),
    [rightFormat, setRightFormat] = useState('auto');
  const [keys, setKeys] = useState<string[]>(['sku']),
    [options, setOptions] = useState(defaultOptions);
  const [report, setReport] = useState<Report | null>(initialReport),
    [error, setError] = useState('');
  const [revision, setRevision] = useState(0),
    [sourceRevision, setSourceRevision] = useState(0),
    [dark, setDark] = useState(false);
  const job = useRef(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const {
    inputs,
    loading,
    compare: compareInWorker,
    suggest: suggestInWorker,
    cancel,
  } = useComparison(left, right, leftFormat, rightFormat);
  const visibleError =
    error || (!loading && (left || right) ? inputs.error : '');
  const common =
    inputs.a && inputs.b
      ? inputs.a.columns.filter((c) => inputs.b!.columns.includes(c))
      : [];
  const selectedKeys = keys.filter((k) => common.includes(k));
  const allColumns = [
    ...new Set([...(inputs.a?.columns ?? []), ...(inputs.b?.columns ?? [])]),
  ];

  function invalidate() {
    job.current++;
    setBusy(false);
    setReport(null);
    setError('');
    setNotice('');
  }
  const compare = useCallback(async () => {
    if (loading || busy) return;
    const id = ++job.current;
    setBusy(true);
    setNotice('');
    try {
      if (!inputs.a || !inputs.b) throw new Error(inputs.error);
      const selected = keys.filter(
        (k) => inputs.a!.columns.includes(k) && inputs.b!.columns.includes(k),
      );
      const result = await compareInWorker({
        ...options,
        keys: selected,
        tolerance: Number(options.tolerance),
      });
      if (id !== job.current) return;
      setReport(result);
      setRevision((v) => v + 1);
      setError('');
    } catch (e) {
      if (id !== job.current || (e as Error).name === 'AbortError') return;
      setError((e as Error).message);
      setReport(null);
    } finally {
      if (id === job.current) setBusy(false);
    }
  }, [inputs, keys, options, loading, busy, compareInWorker]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void compare();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [compare]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  function demo() {
    invalidate();
    setSourceRevision((v) => v + 1);
    setLeft(DEMO_BEFORE);
    setRight(DEMO_AFTER);
    setLeftName('Sample · catalog-before.csv');
    setRightName('Sample · catalog-after.csv');
    setLeftFormat('auto');
    setRightFormat('auto');
    setKeys(['sku']);
    setOptions(defaultOptions);
    setReport(initialReport);
    setRevision((v) => v + 1);
    setError('');
  }
  function clear() {
    setSourceRevision((v) => v + 1);
    setLeft('');
    setRight('');
    setLeftName('No file selected');
    setRightName('No file selected');
    setLeftFormat('auto');
    setRightFormat('auto');
    setKeys([]);
    setOptions(defaultOptions);
    invalidate();
  }
  async function suggest() {
    if (loading || busy) return;
    const id = ++job.current;
    setBusy(true);
    try {
      if (!inputs.a || !inputs.b) throw new Error(inputs.error);
      const found = await suggestInWorker();
      if (id !== job.current) return;
      if (!found)
        throw new Error(
          'No single unique column was found. Select two or more columns to form a composite key.',
        );
      setKeys([found]);
      setOptions((o) => ({
        ...o,
        ignoreColumns: o.ignoreColumns.filter((c) => c !== found),
      }));
      invalidate();
    } catch (e) {
      if (id === job.current && (e as Error).name !== 'AbortError')
        setError((e as Error).message);
    } finally {
      if (id === job.current) setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          href={import.meta.env.BASE_URL}
          className="brand"
          aria-label="Rowglass home"
        >
          <span className="brand-icon">
            <ArrowRightLeft size={21} />
          </span>
          rowglass<span className="brand-tag">DATA DIFF</span>
        </a>
        <div className="header-actions">
          <span className="privacy-pill">
            <ShieldCheck size={15} />
            Files stay on your device
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? 'Use light theme' : 'Use dark theme'}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          <a
            className="github-link"
            href="https://github.com/Yougan001/rowglass"
            target="_blank"
            rel="noreferrer"
          >
            <CodeXml size={18} />
            GitHub
          </a>
        </div>
      </header>
      <main>
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">THE LOCAL DATA COMPARISON WORKSPACE</div>
            <h1>
              See what changed<span>.</span>
            </h1>
            <p>Compare CSV and JSON by key. Find the changes that matter.</p>
          </div>
          <div className="heading-actions">
            <Button variant="ghost" className="action-button" onClick={clear}>
              <RotateCcw />
              Clear
            </Button>
            <Button variant="outline" className="action-button" onClick={demo}>
              <FlaskConical />
              Try sample data
            </Button>
          </div>
        </div>
        <section className="source-grid" aria-label="Data sources">
          <SourceInput
            key={'a' + sourceRevision}
            marker="A"
            title="Original"
            text={left}
            name={leftName}
            format={leftFormat}
            count={inputs.a?.count}
            columns={inputs.a?.columns.length}
            onChange={(text, name) => {
              setLeft(text);
              setLeftName(name);
              invalidate();
            }}
            onFormat={(format) => {
              setLeftFormat(format);
              invalidate();
            }}
            onError={(message) => {
              invalidate();
              setError(message);
              setReport(null);
            }}
          />
          <SourceInput
            key={'b' + sourceRevision}
            marker="B"
            title="Updated"
            text={right}
            name={rightName}
            format={rightFormat}
            count={inputs.b?.count}
            columns={inputs.b?.columns.length}
            onChange={(text, name) => {
              setRight(text);
              setRightName(name);
              invalidate();
            }}
            onFormat={(format) => {
              setRightFormat(format);
              invalidate();
            }}
            onError={(message) => {
              invalidate();
              setError(message);
              setReport(null);
            }}
          />
        </section>
        <div className="key-bar">
          <div className="key-intro">
            <strong>Match records by</strong>
            <span>Select a unique ID or combine columns.</span>
          </div>
          <fieldset className="key-choices" aria-label="Key columns">
            {common.length ? (
              common.map((c) => (
                <label
                  key={c}
                  className={
                    'key-choice ' + (selectedKeys.includes(c) ? 'selected' : '')
                  }
                >
                  <Checkbox
                    checked={selectedKeys.includes(c)}
                    onCheckedChange={(checked) => {
                      setKeys(
                        checked
                          ? [...selectedKeys, c]
                          : selectedKeys.filter((k) => k !== c),
                      );
                      if (checked)
                        setOptions((o) => ({
                          ...o,
                          ignoreColumns: o.ignoreColumns.filter((k) => k !== c),
                        }));
                      invalidate();
                    }}
                  />
                  {c}
                </label>
              ))
            ) : (
              <span className="muted">
                Load two valid files to choose their key columns.
              </span>
            )}
          </fieldset>
          <Button
            variant="ghost"
            className="action-button suggest-button"
            disabled={loading || busy}
            onClick={suggest}
          >
            <Lightbulb />
            Suggest key
          </Button>
        </div>
        <Collapsible className="options-block">
          <div className="compare-bar">
            <CollapsibleTrigger className="options-trigger">
              <SlidersHorizontal size={16} />
              Comparison options
              <span className="option-count">
                {Number(options.trimWhitespace) +
                  Number(options.ignoreCase) +
                  Number(options.strictTypes) +
                  Number(Number(options.tolerance) > 0) +
                  options.ignoreColumns.length || 'Default'}
              </span>
            </CollapsibleTrigger>
            <span className="keyboard-hint">Ctrl / ⌘ + Enter</span>
            {busy && (
              <Button
                variant="outline"
                onClick={() => {
                  invalidate();
                  cancel();
                  setNotice('Stopped. Your inputs are unchanged.');
                }}
              >
                Stop
              </Button>
            )}
            <Button
              className="action-button compare-button"
              onClick={compare}
              disabled={loading || busy}
            >
              <ArrowRightLeft />
              {busy ? 'Working…' : loading ? 'Reading data…' : 'Compare data'}
              <ArrowRight size={16} />
            </Button>
          </div>
          <CollapsibleContent>
            <div className="options-content">
              <div className="option-switches">
                {(
                  [
                    { field: 'trimWhitespace', label: 'Trim whitespace' },
                    { field: 'ignoreCase', label: 'Ignore case' },
                    { field: 'strictTypes', label: 'Strict JSON types' },
                  ] as const
                ).map((item) => (
                  <label key={item.field}>
                    <Checkbox
                      checked={options[item.field]}
                      onCheckedChange={(checked) => {
                        setOptions((o) => ({ ...o, [item.field]: !!checked }));
                        invalidate();
                      }}
                    />
                    {item.label}
                  </label>
                ))}
                <label className="tolerance-label">
                  Numeric tolerance
                  <input
                    aria-label="Numeric tolerance"
                    type="number"
                    step="any"
                    min="0"
                    value={options.tolerance}
                    onChange={(e) => {
                      setOptions((o) => ({ ...o, tolerance: e.target.value }));
                      invalidate();
                    }}
                  />
                </label>
              </div>
              <div className="ignore-columns">
                <strong>Ignore columns</strong>
                <div>
                  {allColumns
                    .filter((c) => !selectedKeys.includes(c))
                    .map((c) => (
                      <label key={c}>
                        <Checkbox
                          checked={options.ignoreColumns.includes(c)}
                          onCheckedChange={(checked) => {
                            setOptions((o) => ({
                              ...o,
                              ignoreColumns: checked
                                ? [...o.ignoreColumns, c]
                                : o.ignoreColumns.filter((k) => k !== c),
                            }));
                            invalidate();
                          }}
                        />
                        {c}
                      </label>
                    ))}
                </div>
              </div>
              <p>
                Options apply to compared values. Matching keys stay exact.
                Missing, null and empty values remain distinct.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
        {notice && <output className="export-notice">{notice}</output>}
        {loading && (
          <output className="worker-status">
            Reading locally in the background. You can keep editing.
          </output>
        )}
        {visibleError && (
          <div className="error-box" role="alert">
            {visibleError}
          </div>
        )}
        {report ? (
          <Results key={revision} report={report} />
        ) : (
          !visibleError && (
            <div className="empty-result">
              <ArrowRightLeft size={28} />
              <h2>Ready when you are</h2>
              <p>Load two files, select their key columns, then compare.</p>
            </div>
          )
        )}
        <footer className="app-footer">
          <span>
            <ShieldCheck size={15} />
            Private by design. Open source by choice.
          </span>
          <span>UTF-8 · Up to 50,000 rows · 200 columns</span>
        </footer>
      </main>
    </div>
  );
}
