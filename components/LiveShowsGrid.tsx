'use client';
import React, { useEffect, useMemo, useState } from 'react';

/**
 * LIMITED HANGOUT — LIVE SHOWS GRID
 * Reads 3 tabs (Devin, Pat, Matt) from your published CSV sheet.
 * This version NEVER calls JSON.parse on the sheet response.
 */

const DEMO_MODE = false;

// your published sheet base:
const PUBLISHED_BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVtnWrYtSM5a5KMeb_k7qIukbJbnkoMqRhFDgJ60I2obN1pycbQo4E-SchhDDhZL3UqCU9N_A_LNFM/pub?output=csv&sheet=';

// CSV parser that handles "Washington, DC"
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // handle doubled quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

async function fetchSheetTab(sheetName: string) {
  try {
    const url = PUBLISHED_BASE + encodeURIComponent(sheetName);
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();

    // log what we actually got
    console.log(`CSV for ${sheetName}:`, text.slice(0, 200));

    // if Google ever sends HTML (login page), bail out
    if (text.toLowerCase().includes('<html')) {
      console.warn(`Sheet ${sheetName} returned HTML (not public?)`);
      return [];
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (!lines.length) return [];

    const headers = parseCsvLine(lines[0]);

    const rows = lines.slice(1).map((line) => {
      const cells = parseCsvLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (cells[i] ?? '').trim();
      });
      return obj;
    });

    return rows as {
      Date: string;
      Time: string;
      City: string;
      Venue: string;
      Ticket: string;
      Status?: string;
    }[];
  } catch (err) {
    console.error('Sheet fetch failed', err);
    return [];
  }
}

function pad2(n: number | string) {
  return String(n).padStart(2, '0');
}

function normalizeDateText(input: string) {
  if (!input) return input;
  const trimmed = input.trim();

  // gviz-style
  const m = /^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})/.exec(trimmed);
  if (m) {
    const [_, y, mth, d] = m;
    return `${y}-${pad2(Number(mth) + 1)}-${pad2(d)}`;
  }

  // MM/DD/YYYY
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mdy) {
    const [_, mm, dd, yyyy] = mdy;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  return trimmed;
}

function normalizeTimeText(input: string) {
  if (!input) return input;
  const trimmed = input.trim();

  // gviz-style datetime
  const m = /^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2}),\s*(\d{1,2}),\s*(\d{1,2}),\s*(\d{1,2})\)/.exec(trimmed);
  if (m) {
    let [, , , , hh, mm] = m;
    let H = Number(hh);
    const ampm = H >= 12 ? 'PM' : 'AM';
    H = H % 12 || 12;
    return `${H}:${pad2(mm)} ${ampm}`;
  }

  return trimmed;
}

function parseDate(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return null;
  const mDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const mTime = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(timeStr.trim());
  if (!mDate || !mTime) return null;

  const [, y, m, d] = mDate.map(String);
  let [, hh, mm, ampm] = mTime;
  let H = parseInt(hh, 10);
  const M = parseInt(mm, 10);

  ampm = ampm.toUpperCase();
  if (ampm === 'PM' && H !== 12) H += 12;
  if (ampm === 'AM' && H === 12) H = 0;

  const dt = new Date(Number(y), Number(m) - 1, Number(d), H, M, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatNice(dt: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dt);
}

function monthKey(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function ShowCard({ show }: { show: any }) {
  const dt = show.Time ? parseDate(show.Date, show.Time) : null;
  const nice = dt ? formatNice(dt) : show.Date;
  const sold = /sold\s*out/i.test(show.Status || '');

  return (
    <div
      className={`relative block rounded-2xl border p-4 shadow-sm transition-shadow ${
        sold ? 'opacity-80' : 'hover:shadow-md'
      } border-gray-200`}
    >
      {sold && (
        <div className="absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-gray-100 border-gray-300">
          Sold Out
        </div>
      )}
      <div className="text-sm text-gray-500">{nice}</div>
      <div className="mt-1 font-semibold text-base leading-snug">{show.Venue || 'Show'}</div>
      <div className="text-sm text-gray-600">{show.City}</div>
      {show.Ticket && !sold ? (
        <a
          href={show.Ticket}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm underline"
        >
          Buy tickets
        </a>
      ) : (
        <div className="mt-2 text-sm text-gray-400">
          {sold ? 'No tickets available' : 'Details coming soon'}
        </div>
      )}
    </div>
  );
}

function Column({ title, shows }: { title: string; shows: any[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl text-gray-900 font-bold tracking-tight">{title}</h2>
      {shows && shows.length > 0 ? (
        <div className="grid gap-3">
          {shows.map((s, i) => (
            <ShowCard key={`${title}-${i}`} show={s} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic">No upcoming shows match your filters.</div>
      )}
    </div>
  );
}

export default function LiveShowsGrid() {
  const [data, setData] = useState({ Devin: [], Pat: [], Matt: [] } as Record<string, any[]>);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (DEMO_MODE) return;
      try {
        setLoading(true);
        const [devin, pat, matt] = await Promise.all([
          fetchSheetTab('Devin'),
          fetchSheetTab('Pat'),
          fetchSheetTab('Matt'),
        ]);
        if (!cancelled) setData({ Devin: devin, Pat: pat, Matt: matt });
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Could not load shows from Google Sheets.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalized = useMemo(() => {
    function normalize(arr: any[]) {
      return (arr || [])
        .map((r) => {
          const rawDate = (r.Date ?? r.date ?? '').trim();
          const rawTime = (r.Time ?? r.time ?? '').trim();
          const normalizedDate = normalizeDateText(rawDate);
          const normalizedTime = normalizeTimeText(rawTime);

          return {
            Date: normalizedDate,
            Time: normalizedTime,
            City: (r.City ?? r.city ?? '').trim(),
            Venue: (r.Venue ?? r.venue ?? r['Venue/Show Name'] ?? '').trim(),
            Ticket: (
              r.Ticket ??
              r.Tickets ??
              r.ticket ??
              r.tickets ??
              r.Link ??
              r['Ticket Link'] ??
              r['Buy Link'] ??
              ''
            ).trim(),
            Status: (r.Status ?? r.status ?? '').trim(),
          };
        })
        .filter((r) => r.Date)
        .filter((r) => {
          const dt = r.Time ? parseDate(r.Date, r.Time) : null;
          if (!dt) return true;
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return dt >= todayStart;
        })
        .sort((a, b) => {
          const da = a.Time ? parseDate(a.Date, a.Time)?.getTime() ?? 0 : 0;
          const db = b.Time ? parseDate(b.Date, b.Time)?.getTime() ?? 0 : 0;
          return da - db;
        });
    }

    return {
      Devin: normalize(data.Devin),
      Pat: normalize(data.Pat),
      Matt: normalize(data.Matt),
    };
  }, [data]);

  const filterOptions = useMemo(() => {
    const all = [...normalized.Devin, ...normalized.Pat, ...normalized.Matt];
    const monthsSet = new Set<string>();
    const citiesSet = new Set<string>();

    for (const s of all) {
      const dt = s.Time ? parseDate(s.Date, s.Time) : null;
      if (dt) monthsSet.add(monthKey(dt));
      if (s.City) citiesSet.add(s.City);
    }

    return {
      months: Array.from(monthsSet).sort(),
      cities: Array.from(citiesSet).sort((a, b) => a.localeCompare(b)),
    };
  }, [normalized]);

  const finalData = useMemo(() => {
    function byFilters(arr: any[]) {
      return arr.filter((s) => {
        const dt = s.Time ? parseDate(s.Date, s.Time) : null;
        const mk = dt ? monthKey(dt) : '';
        const monthOk = selectedMonth === 'all' || mk === selectedMonth;
        const cityOk = selectedCity === 'all' || s.City === selectedCity;
        return monthOk && cityOk;
      });
    }
    return {
      Devin: byFilters(normalized.Devin),
      Pat: byFilters(normalized.Pat),
      Matt: byFilters(normalized.Matt),
    };
  }, [normalized, selectedMonth, selectedCity]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Live Shows</h1>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Month</span>
          <select
            className="w-full rounded-xl border border-gray-300 p-2"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">All months</option>
            {filterOptions.months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">City</span>
          <select
            className="w-full rounded-xl border border-gray-300 p-2"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="all">All cities</option>
            {filterOptions.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            className="rounded-xl border px-3 py-2 text-sm shadow-sm hover:shadow border-gray-300"
            onClick={() => {
              setSelectedMonth('all');
              setSelectedCity('all');
            }}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Column title="Devin" shows={finalData.Devin} />
        <Column title="Pat" shows={finalData.Pat} />
        <Column title="Matt" shows={finalData.Matt} />
      </div>
    </div>
  );
}
