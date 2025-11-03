'use client';
import React, { useEffect, useMemo, useState } from 'react';

/**
 * LIMITED HANGOUT — LIVE SHOWS GRID
 * Reads 3 tabs (Devin, Pat, Matt) from your published CSV sheet.
 * Updated for dark theme readability and modern styling.
 */

const DEMO_MODE = false;
const PUBLISHED_BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVtnWrYtSM5a5KMeb_k7qIukbJbnkoMqRhFDgJ60I2obN1pycbQo4E-SchhDDhZL3UqCU9N_A_LNFM/pub?output=csv&sheet=';

// CSV parser that handles commas inside quotes
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
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

    console.log(`CSV for ${sheetName}:`, text.slice(0, 200));

    if (text.toLowerCase().includes('<html')) {
      console.warn(`Sheet ${sheetName} returned HTML (not public?)`);
      return [];
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
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
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mdy) {
    const [_, mm, dd, yyyy] = mdy;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
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

  const dt = new Date(Number(y), Number(m) - 1, Number(d), H, M);
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
      className={`relative block rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-md transition-transform duration-150 ${
        sold ? 'opacity-70' : 'hover:-translate-y-1 hover:shadow-lg hover:border-gray-500'
      }`}
    >
      {sold && (
        <div className="absolute right-3 top-3 rounded-full border border-gray-600 bg-gray-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-300">
          Sold Out
        </div>
      )}
      <div className="text-sm text-gray-400">{nice}</div>
      <div className="mt-1 font-semibold text-lg text-gray-100 leading-snug">{show.Venue || 'Show'}</div>
      <div className="text-sm text-gray-400">{show.City}</div>
      {show.Ticket && !sold ? (
        <a
          href={show.Ticket}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm underline text-blue-400 hover:text-blue-300"
        >
          Buy tickets
        </a>
      ) : (
        <div className="mt-2 text-sm text-gray-500">
          {sold ? 'No tickets available' : 'Details coming soon'}
        </div>
      )}
    </div>
  );
}

function Column({ title, shows }: { title: string; shows: any[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
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

  const normalize = (arr: any[]) =>
    (arr || [])
      .map((r) => ({
        Date: (r.Date ?? '').trim(),
        Time: (r.Time ?? '').trim(),
        City: (r.City ?? '').trim(),
        Venue: (r.Venue ?? r['Venue/Show Name'] ?? '').trim(),
        Ticket: (r.Ticket ?? '').trim(),
        Status: (r.Status ?? '').trim(),
      }))
      .filter((r) => r.Date)
      .sort((a, b) => {
        const da = parseDate(a.Date, a.Time)?.getTime() ?? 0;
        const db = parseDate(b.Date, b.Time)?.getTime() ?? 0;
        return da - db;
      });

  const normalized = useMemo(
    () => ({
      Devin: normalize(data.Devin),
      Pat: normalize(data.Pat),
      Matt: normalize(data.Matt),
    }),
    [data]
  );

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
    <div className="max-w-6xl mx-auto p-4 md:p-8 text-gray-100">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Live Shows</h1>
        {loading && <span className="text-sm text-gray-400">Loading…</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-white-300">Month</span>
          <select
            className="w-full rounded-xl border border-gray-500 bg-gray-800 text-gray-100 p-2 focus:border-white focus:ring-white"
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
          <span className="mb-1 block text-sm font-medium text-white-300">City</span>
          <select
            className="w-full rounded-xl border border-gray-500 bg-gray-800 text-gray-100 p-2 focus:border-white focus:ring-white"
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
            className="rounded-xl border border-gray-500 px-3 py-2 text-sm shadow-sm hover:bg-gray-700 text-gray-100"
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
