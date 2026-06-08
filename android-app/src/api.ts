/**
 * لایه‌ی داده‌ی اپ نیتیو.
 *
 * لیست سرورها: اول از JSON باندل‌شده (فوری، همیشه آفلاین کار می‌کند)، سپس در
 * پس‌زمینه تلاش برای آپدیت لایو از بک‌اند Node؛ اگر لیست لایو بزرگ‌تر بود
 * جایگزین می‌شود. پینگ: مستقیم به /api/ping بک‌اند (که OpenSSL probe دارد).
 */
import bundled from './data/servers.json';
import {Provider, ProviderId} from './providers';

export interface Server {
  hostname: string;
  country: string;
  city: string;
  code: string;
  flag: string;
  ip?: string | null;
}

export type PingState = 'ok' | 'dpi' | 'bad' | 'dns' | 'unscanned';

export interface PingResult {
  state: PingState;
  ms: number | null;
  method: string | null;
}

const BUNDLED = bundled as Record<ProviderId, Server[]>;

export function getBundled(id: ProviderId): Server[] {
  return BUNDLED[id] || [];
}

export interface CountryGroup {
  code: string;
  country: string;
  flag: string;
  servers: Server[];
}

/** سرورها را بر اساس کشور گروه‌بندی می‌کند (مرتب‌شده بر اساس تعداد، نزولی). */
export function groupByCountry(servers: Server[]): CountryGroup[] {
  const map = new Map<string, CountryGroup>();
  for (const s of servers) {
    const key = s.code || s.country || 'XX';
    let g = map.get(key);
    if (!g) {
      g = {code: s.code || 'XX', country: s.country || 'Unknown', flag: s.flag || '🌐', servers: []};
      map.set(key, g);
    }
    g.servers.push(s);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.servers.length - a.servers.length || a.country.localeCompare(b.country),
  );
}

/**
 * تلاش برای گرفتن لیست تازه از بک‌اند. اگر موفق و بزرگ‌تر بود برمی‌گرداند،
 * وگرنه null تا از لیست باندل‌شده استفاده شود.
 */
export async function fetchLive(p: Provider): Promise<Server[] | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(`http://localhost:${p.port}/api/servers`, {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    const servers: Server[] = j.servers || [];
    if (servers.length > 5) {
      return servers.map(s => ({
        hostname: s.hostname,
        country: s.country || '',
        city: s.city || '',
        code: (s.code || '').toUpperCase(),
        flag: s.flag || '🌐',
        ip: (s as any).ip || null,
      }));
    }
    return null;
  } catch {
    return null;
  }
}

/** پینگ یک سرور از طریق بک‌اند Node. host می‌تواند hostname یا IP باشد. */
export async function pingHost(
  port: number,
  host: string,
): Promise<PingResult> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(
      `http://localhost:${port}/api/ping?host=${encodeURIComponent(host)}`,
      {signal: ctrl.signal},
    );
    clearTimeout(t);
    const j = await r.json();
    let state: PingState = 'bad';
    if (j.vpnAccessible) {
      state = 'ok';
    } else if (j.ms != null) {
      state = 'dpi';
    } else if (j.method === 'dns-fail') {
      state = 'dns';
    }
    return {state, ms: j.ms ?? null, method: j.method ?? null};
  } catch {
    return {state: 'bad', ms: null, method: null};
  }
}
