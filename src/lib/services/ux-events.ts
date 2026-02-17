type UxEventProps = Record<string, string | number | boolean | null | undefined>;

export function trackUxEvent(name: string, props: UxEventProps = {}): void {
  try {
    const payload = JSON.stringify({
      name,
      props,
      path: typeof window !== "undefined" ? window.location.pathname : "",
      timestamp: new Date().toISOString(),
    });

    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/ux-events", blob);
      return;
    }

    void fetch("/api/ux-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Intentionally swallow telemetry failures.
  }
}

