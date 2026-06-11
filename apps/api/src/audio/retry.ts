/** Retry with exponential backoff — absorbs provider 429s/transient failures. */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> => {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        const delay = base * 2 ** i + Math.random() * 250;
        console.warn(`[retry] ${opts.label ?? 'call'} failed (attempt ${i + 1}/${attempts}), retrying in ${Math.round(delay)}ms:`, (err as Error).message);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
};

/** Run async tasks over `items` with bounded concurrency, preserving order. */
export const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return results;
};
