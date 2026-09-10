export type RefreshState = {
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
};
/** One request at a time; disposal cancels and ignores even non-cooperative loaders. */
export function createRefreshController<T>(
  load: (signal: AbortSignal) => Promise<T>,
  accept: (data: T) => void,
  state: (s: RefreshState) => void,
  env: { window: Window; document: Document },
  interval = 30000,
) {
  let disposed = false,
    running = false,
    lastUpdated: number | null = null,
    error: string | null = null,
    active: AbortController | null = null;
  const publish = () => {
    if (!disposed) state({ refreshing: running, error, lastUpdated });
  };
  const refresh = async () => {
    if (disposed || running || env.document.visibilityState === "hidden")
      return;
    running = true;
    active = new AbortController();
    publish();
    const controller = active;
    let timedOut = false;
    const timeout = env.window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);
    try {
      const data = await load(controller.signal);
      if (disposed) return;
      if (timedOut) throw Error("Request timed out");
      accept(data);
      lastUpdated = Date.now();
      error = null;
    } catch (e) {
      if (!disposed)
        error = timedOut
          ? "Request timed out"
          : e instanceof Error
            ? e.message
            : "Refresh failed";
    } finally {
      env.window.clearTimeout(timeout);
      running = false;
      active = null;
      publish();
    }
  };
  const trigger = () => {
    void refresh();
  };
  const timer = env.window.setInterval(trigger, interval);
  env.window.addEventListener("focus", trigger);
  env.window.addEventListener("online", trigger);
  env.document.addEventListener("visibilitychange", trigger);
  return {
    refresh,
    dispose() {
      disposed = true;
      active?.abort();
      env.window.clearInterval(timer);
      env.window.removeEventListener("focus", trigger);
      env.window.removeEventListener("online", trigger);
      env.document.removeEventListener("visibilitychange", trigger);
    },
  };
}
