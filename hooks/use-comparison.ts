import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CompareOptions, Report } from '@/core/compare.mjs';

type Metadata = { columns: string[]; count: number; format: string };
type Inputs = { a: Metadata | null; b: Metadata | null; error: string };
type Request = { type: string; [key: string]: unknown };
type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};
const emptyInputs: Inputs = { a: null, b: null, error: '' };

export function useComparison(
  left: string,
  right: string,
  leftFormat: string,
  rightFormat: string,
) {
  const [restart, setRestart] = useState(0);
  const source = useMemo(
    () => ({ left, right, leftFormat, rightFormat, restart }),
    [left, right, leftFormat, rightFormat, restart],
  );
  const [completed, setCompleted] = useState<{
    source: typeof source;
    inputs: Inputs;
  } | null>(null);
  const loading = completed?.source !== source;
  const inputs = loading ? emptyInputs : completed.inputs;
  const worker = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const sequence = useRef(0);

  const request = useCallback(<T>(message: Request): Promise<T> => {
    const current = worker.current;
    if (!current)
      return Promise.reject(new Error('The comparison worker is not ready.'));
    return new Promise<T>((resolve, reject) => {
      const id = ++sequence.current;
      pending.current.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      current.postMessage({ id, ...message });
    });
  }, []);

  useEffect(() => {
    let active = true;
    const requests = pending.current;
    const current = new Worker(
      new URL('../workers/compare.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.current = current;
    current.onmessage = (event) => {
      if (!active) return;
      const waiting = requests.get(event.data.id);
      if (!waiting) return;
      requests.delete(event.data.id);
      if (event.data.error) waiting.reject(new Error(event.data.error));
      else waiting.resolve(event.data.result);
    };
    current.onerror = () => {
      if (!active) return;
      const error = new Error(
        'The comparison worker stopped. Reload the page and try again.',
      );
      for (const waiting of requests.values()) waiting.reject(error);
      requests.clear();
      setCompleted({
        source,
        inputs: { a: null, b: null, error: error.message },
      });
    };
    const timer = window.setTimeout(() => {
      request<{ a: Metadata; b: Metadata }>({
        type: 'load',
        before: { text: source.left, format: source.leftFormat },
        after: { text: source.right, format: source.rightFormat },
      })
        .then((result) => {
          if (active)
            setCompleted({ source, inputs: { ...result, error: '' } });
        })
        .catch((error) => {
          if (active)
            setCompleted({
              source,
              inputs: { a: null, b: null, error: error.message },
            });
        });
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timer);
      current.terminate();
      if (worker.current === current) worker.current = null;
      for (const waiting of requests.values())
        waiting.reject(new DOMException('Comparison cancelled.', 'AbortError'));
      requests.clear();
    };
  }, [source, request]);

  return {
    inputs,
    loading,
    compare: useCallback(
      (options: CompareOptions) =>
        request<Report>({ type: 'compare', options }),
      [request],
    ),
    suggest: useCallback(() => request<string>({ type: 'suggest' }), [request]),
    cancel: useCallback(() => setRestart((value) => value + 1), []),
  };
}
