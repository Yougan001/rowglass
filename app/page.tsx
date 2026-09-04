'use client';
import { useState } from 'react';
import { ArrowRight, ArrowRightLeft, Download, CodeXml as Github, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { parseDataset, compareDatasets, suggestKey, displayValue, reportCsv } from '@/core/compare.mjs';
import { DEMO_BEFORE, DEMO_AFTER } from '@/lib/demo';
type Report = ReturnType<typeof compareDatasets>;
const initialReport = compareDatasets(parseDataset(DEMO_BEFORE), parseDataset(DEMO_AFTER), { keys: ['sku'] });
export default function Home() {
  const [left, setLeft] = useState(DEMO_BEFORE), [right, setRight] = useState(DEMO_AFTER);
  const [key, setKey] = useState('sku'), [error, setError] = useState('');
  const [report, setReport] = useState<Report | null>(initialReport);
  function compare() {
    try { const a = parseDataset(left), b = parseDataset(right); const chosen = key || suggestKey(a, b); setReport(compareDatasets(a, b, { keys: [chosen] })); setKey(chosen); setError(''); }
    catch (e) { setError((e as Error).message); setReport(null); }
  }
  function demo() { setLeft(DEMO_BEFORE); setRight(DEMO_AFTER); setKey('sku'); setReport(initialReport); setError(''); }
  function exportReport() { if (!report) return; const url = URL.createObjectURL(new Blob([reportCsv(report)], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'rowglass-differences.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <div className="app-shell">
    <header className="app-header"><a href="/" className="brand" aria-label="Rowglass home"><span className="brand-icon"><ArrowRightLeft size={21} /></span>rowglass<span className="brand-tag">DATA DIFF</span></a><div className="header-actions"><span className="privacy-pill"><ShieldCheck size={15} />Files stay on your device</span><a className="github-link" href="https://github.com/Yougan001/rowglass" target="_blank" rel="noreferrer"><Github size={18} />GitHub</a></div></header>
    <main><div className="workspace-heading"><div><div className="eyebrow">THE LOCAL DATA COMPARISON WORKSPACE</div><h1>See what changed<span>.</span></h1><p>Compare CSV and JSON by key. Find the changes that matter.</p></div><Button variant="outline" className="action-button" onClick={demo}><Sparkles />Try sample data</Button></div>
      <section className="source-grid" aria-label="Data sources">{[{ title: 'Original', text: left, set: setLeft, label: 'A' }, { title: 'Updated', text: right, set: setRight, label: 'B' }].map(source => <div className="source-card" key={source.label}><div className="source-heading"><span className={'source-letter source-' + source.label}>{source.label}</span><h2>{source.title}</h2><span className="source-format">CSV / TSV / JSON</span></div><textarea aria-label={source.title + ' data'} spellCheck={false} value={source.text} onChange={e => { source.set(e.target.value); setReport(null); }} /><div className="source-footer"><span>Paste data with a header row</span><span>50,000 row limit</span></div></div>)}</section>
      <div className="compare-bar"><label htmlFor="match-key">Match records by<input id="match-key" value={key} placeholder="Column name" onChange={e => { setKey(e.target.value); setReport(null); }} /></label><p>Row order does not affect the result.</p><Button className="action-button compare-button" onClick={compare}><ArrowRightLeft />Compare data<ArrowRight size={16} /></Button></div>
      {error && <div className="error-box" role="alert">{error}</div>}
      {report ? <section className="results" aria-label="Comparison results"><div className="results-heading"><div><span className="eyebrow">COMPARISON COMPLETE</span><h2>A clearer view of every change</h2></div><Button variant="outline" className="action-button" onClick={exportReport}><Download />Export CSV</Button></div><div className="summary-grid">{(['modified', 'added', 'removed', 'unchanged'] as const).map(status => <div key={status} className={'summary-card ' + status}><span className="summary-label"><i />{status}</span><strong>{report.summary[status]}</strong><span>{status === 'modified' ? `${report.summary.changedCells} cells changed` : status === 'unchanged' ? 'Matched and identical' : `Records ${status}`}</span></div>)}</div><div className="table-frame"><Table><TableHeader><TableRow><TableHead>Status</TableHead>{report.columns.map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{report.rows.filter(r => r.status !== 'unchanged').slice(0, 50).map(row => <TableRow key={row.key}><TableCell><span className={'status-badge ' + row.status}>{row.status}</span></TableCell>{report.columns.map(c => <TableCell key={c}>{row.status === 'modified' && row.changes.includes(c) ? <span className="cell-change"><del>{displayValue(row.before?.[c])}</del><ArrowRight size={13} /><ins>{displayValue(row.after?.[c])}</ins></span> : displayValue((row.after ?? row.before)?.[c])}</TableCell>)}</TableRow>)}</TableBody></Table></div><div className="results-footer"><span>Changed records · matched by <code>{report.keys.join(' + ')}</code></span><span>Compared locally. No uploads.</span></div></section> : !error && <div className="empty-result"><ArrowRightLeft size={28} /><h2>Ready when you are</h2><p>Choose a key column, then compare your data.</p></div>}
      <footer className="app-footer"><span><ShieldCheck size={15} />Private by design. Open source by choice.</span><span>CSV · TSV · JSON</span></footer>
    </main></div>;
}
