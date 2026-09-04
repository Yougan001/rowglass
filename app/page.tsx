'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { parseDataset, compareDatasets, suggestKey } from '@/core/compare.mjs';
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
  const inputs = useMemo(() => {
    try {
      return {
        a: parseDataset(left, leftFormat),
        b: parseDataset(right, rightFormat),
        error: '',
      };
    } catch (e) {
      return { a: null, b: null, error: (e as Error).message };
    }
  }, [left, right, leftFormat, rightFormat]);
  const common =
    inputs.a && inputs.b
      ? inputs.a.columns.filter((c) => inputs.b!.columns.includes(c))
      : [];
  const selectedKeys = keys.filter((k) => common.includes(k));
  const allColumns = [
    ...new Set([...(inputs.a?.columns ?? []), ...(inputs.b?.columns ?? [])]),
  ];

  function invalidate() {
    setReport(null);
    setError('');
  }
  const compare = useCallback(() => {
    try {
      if (!inputs.a || !inputs.b) throw new Error(inputs.error);
      const selected = keys.filter(
        (k) => inputs.a!.columns.includes(k) && inputs.b!.columns.includes(k),
      );
      const result = compareDatasets(inputs.a, inputs.b, {
        ...options,
        keys: selected,
        tolerance: Number(options.tolerance),
      });
      setReport(result);
      setRevision((v) => v + 1);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setReport(null);
    }
  }, [inputs, keys, options]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        compare();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [compare]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  function demo() {
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
  function suggest() {
    if (!inputs.a || !inputs.b) {
      setError(inputs.error);
      return;
    }
    const found = suggestKey(inputs.a, inputs.b);
    if (found) {
      setKeys([found]);
      setOptions((o) => ({
        ...o,
        ignoreColumns: o.ignoreColumns.filter((c) => c !== found),
      }));
      invalidate();
    } else
      setError(
        'No single unique column was found. Select two or more columns to form a composite key.',
      );
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
            count={inputs.a?.rows.length}
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
            count={inputs.b?.rows.length}
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
            <Button className="action-button compare-button" onClick={compare}>
              <ArrowRightLeft />
              Compare data
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
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {report ? (
          <Results key={revision} report={report} />
        ) : (
          !error && (
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
