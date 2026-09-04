'use client';
import { useEffect, useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
type Props = {
  title: string;
  marker: string;
  text: string;
  name: string;
  format: string;
  count?: number;
  columns?: number;
  onChange: (text: string, name: string) => void;
  onFormat: (format: string) => void;
  onError: (error: string) => void;
};
export function SourceInput(p: Props) {
  const input = useRef<HTMLInputElement>(null),
    request = useRef(0);
  const [reading, setReading] = useState(false),
    [dragging, setDragging] = useState(false);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  async function importFile(file?: File) {
    if (!file) return;
    const id = ++request.current;
    setReading(true);
    try {
      if (file.size > 20_000_000)
        throw new Error('Choose a file smaller than 20 MB.');
      const bytes = await file.arrayBuffer();
      let text: string;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        throw new Error(
          'This file is not UTF-8 text. Export it as UTF-8 CSV or JSON first.',
        );
      }
      if (text.length > 5_000_000)
        throw new Error('Choose a file with fewer than 5 million characters.');
      if (id === request.current) {
        p.onFormat('auto');
        p.onChange(text, file.name);
      }
    } catch (e) {
      if (id === request.current)
        p.onError(`${p.title}: ${(e as Error).message}`);
    } finally {
      if (id === request.current) setReading(false);
      if (input.current) input.current.value = '';
    }
  }
  function change(text: string) {
    request.current++;
    setReading(false);
    p.onChange(text, text ? 'Pasted data' : 'No file selected');
  }
  return (
    <div
      className={'source-card ' + (dragging ? 'is-dragging' : '')}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length !== 1)
          p.onError('Drop one file into each panel.');
        else void importFile(e.dataTransfer.files[0]);
      }}
    >
      <div className="source-heading">
        <span className={'source-letter source-' + p.marker}>{p.marker}</span>
        <h2>{p.title}</h2>
        <NativeSelect
          aria-label={p.title + ' format'}
          value={p.format}
          onChange={(e) => p.onFormat(e.target.value)}
          className="source-format"
        >
          <NativeSelectOption value="auto">Auto-detect</NativeSelectOption>
          <NativeSelectOption value="csv">CSV</NativeSelectOption>
          <NativeSelectOption value="tsv">TSV</NativeSelectOption>
          <NativeSelectOption value="semicolon">Semicolon</NativeSelectOption>
          <NativeSelectOption value="json">JSON</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="file-strip">
        <FileSpreadsheet size={16} />
        <span title={p.name}>
          {reading ? 'Reading on your device…' : p.name}
        </span>
        <input
          ref={input}
          className="sr-only"
          type="file"
          aria-label={'Choose ' + p.title.toLowerCase() + ' file'}
          accept=".csv,.tsv,.json,.txt,text/csv,application/json,text/plain"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
        <Button
          variant="ghost"
          aria-label={'Import ' + p.title.toLowerCase() + ' file'}
          onClick={() => input.current?.click()}
        >
          <Upload size={15} />
          Import
        </Button>
        {p.text && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={'Clear ' + p.title.toLowerCase() + ' data'}
            onClick={() => change('')}
          >
            <X size={15} />
          </Button>
        )}
      </div>
      <textarea
        aria-label={p.title + ' data'}
        maxLength={5_000_000}
        spellCheck={false}
        value={p.text}
        placeholder={
          'Drop a CSV or JSON file here, or paste data.\n\nid,name,price\n1,Desk Light,45.00'
        }
        onChange={(e) => change(e.target.value)}
      />
      <div className="source-footer">
        <span>
          {p.count === undefined
            ? 'CSV · TSV · JSON arrays'
            : `${p.count.toLocaleString()} records · ${p.columns} columns`}
        </span>
        <span>Processed locally</span>
      </div>
    </div>
  );
}
