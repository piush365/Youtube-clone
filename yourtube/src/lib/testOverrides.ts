// Geo/time overrides for demos and QA, e.g. ?testRegion=KL&testHour=11.
// Only honoured when NEXT_PUBLIC_ENABLE_TEST_OVERRIDES=true, on both the
// client (theme) and the server (/api/geo, OTP channel, comment city).

export const TEST_OVERRIDES_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TEST_OVERRIDES === "true";

export interface TestOverrides {
  region?: string;
  hour?: number;
}

const STORAGE_KEY = "yourtube:test-overrides";

export function parseOverrides(region: unknown, hour: unknown): TestOverrides {
  const out: TestOverrides = {};
  if (typeof region === "string" && /^[A-Za-z]{2}$/.test(region)) {
    out.region = region.toUpperCase();
  }
  const h = typeof hour === "string" && hour !== "" ? Number(hour) : typeof hour === "number" ? hour : NaN;
  if (Number.isInteger(h) && h >= 0 && h <= 23) out.hour = h;
  return out;
}

/**
 * Client only. Reads ?testRegion/&testHour from the URL (and remembers them for
 * the tab so they survive navigation). ?testReset=1 clears them.
 */
export function getClientOverrides(): TestOverrides {
  if (!TEST_OVERRIDES_ENABLED || typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  try {
    if (params.has("testReset")) {
      sessionStorage.removeItem(STORAGE_KEY);
      return {};
    }
    if (params.has("testRegion") || params.has("testHour")) {
      const fromUrl = parseOverrides(params.get("testRegion"), params.get("testHour"));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { region?: unknown; hour?: unknown };
      return parseOverrides(parsed.region, parsed.hour);
    }
  } catch {
    // sessionStorage unavailable: fall through to no overrides
  }
  return {};
}

/** Headers the API client attaches so server-side geo sees the same override. */
export function overrideHeaders(): Record<string, string> {
  const o = getClientOverrides();
  const headers: Record<string, string> = {};
  if (o.region) headers["x-test-region"] = o.region;
  if (o.hour !== undefined) headers["x-test-hour"] = String(o.hour);
  return headers;
}
