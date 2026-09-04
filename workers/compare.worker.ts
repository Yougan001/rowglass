import { createSession } from '../core/session.mjs';

const handle = createSession();
self.addEventListener('message', (event: MessageEvent) => {
  const { id, ...message } = event.data;
  try {
    self.postMessage({ id, result: handle(message) });
  } catch (error) {
    self.postMessage({ id, error: (error as Error).message });
  }
});
