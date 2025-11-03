'use client';
import React, { useEffect, useMemo, useState } from 'react';

/**
 * LIMITED HANGOUT — LIVE SHOWS GRID (v2)
 * Three columns (Devin, Pat, Matt) pulling shows from three Google Sheets tabs.
 * Adds: Month & City filters + SOLD OUT badge.
 *
 * GOOGLE SHEETS SETUP
 * 1) One Google Sheet with THREE tabs named exactly: Devin, Pat, Matt
 * 2) Headers in row 1 (case-sensitive):
 *    Date | Time | City | Venue | Ticket | Status (optional)
 *    - Date: YYYY-MM-DD (e.g., 2025-11-05)
 *    - Time: 7:30 PM
 *    - City: Washington, DC
 *    - Venue: DC Improv (or show name)
 *    - Ticket: full URL to buy page (leave blank if none)
 *    - Status: "Sold Out" to show a badge and disable the Buy link (optional)
 * 3) Share → Anyone with the link (Viewer)
 * 4) File → Share → Publish to web → Entire document → Publish
 * 5) Copy the Spreadsheet ID from the URL (between /d/ and /edit)
 * 6) Replace SPREADSHEET_ID below
 */

const SPREADSHEET_ID = "1m2nJyd_UkN0DJtWOtRW1ZbeXX5Xqc-g5XVkwvBvHqUY";
const DEMO_MODE = false;

async function fetchSheetTab(sheetName: string) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
      sheetName
    )}&headers=1&tqx=out:json`;

    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();

    // 👇 NEW: log what came back
    console.log(`Response for ${sheetName} tab:`, text.slice(0, 300));

    // gviz returns JS-wrapped JSON; unwrap it
    const json = JSON.parse(
      text.replace(/^.*setResponse\(/, '').replace(/\);\s*$/, '')
    );

    const table = json.table;
    if (!table || !table.cols || !table.rows) {
      console.warn(`No data found for ${sheetName}`);
      return [];
    }
    const table = json.table;
    if (!table || !table.cols || !table.rows) return [];

    const headers = table.cols.map((c: any) => (c && c.label ? c.label.trim() : ''));

    const rows = table.rows
      .map((r: any) => r.c)
      .filter(Boolean)
      .map((cells: any[]) => {
        const obj: Record<string, string> = {};
        headers.forEach((h: string, i: number) => {
          const cell = cells[i];
          // Prefer formatted string (f) if available; fallback to raw (v)
          const raw = cell ? (cell.f ?? cell.v) : '';
          obj[h] = raw != null ? String(raw).trim() : '';
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

// Handles gviz Date(YYYY,MM,DD[,HH,mm,ss])
function parseGvizDateToken(token: string) {
  const m = /^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})(?:,\s*(\d{1,2}),\s*(\d{1,2}),\s*(\d{1,2}))?\)$/.exec(token);
  if (!m) return null;
  const [_, y, mth, d, hh = '0', mm = '0', ss = '0'] = m;
  return new Date(Number(y), Number(mth), Number(d), Number(hh), Number(mm), Number(ss));
}

function normalizeDateText(input: string) {
  if (!input) return input;
  const trimmed = input.trim();

  // Detect Google gviz Date(YYYY,MM,DD,...)
  const m = /^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})/.exec(trimmed);
  if (m) {
    const [_, y, mth, d] = m;
    return `${y}-${pad2(Number(mth) + 1)}-${pad2(d)}`;
  }

  // Handles MM/DD/YYYY
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

  // Detect gviz Date(YYYY,MM,DD,HH,MM,SS)
  const m = /^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2}),\s*(\d{1,2}),\s*(\d{1,2}),\s*(\d{1,2})\)/.exec(trimmed);
  if (m) {
    let [, , , , hh, mm] = m;
    hh = Number(hh);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${hh}:${pad2(mm)} ${ampm}`;
  }
  return trimmed;
}

function parseDate(dateStr: string, timeStr: string) {
  // dateStr: "YYYY-MM-DD", timeStr: "h:mm AM/PM"
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
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(dt);
  } catch {
    return '';
  }
}

function monthKey(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; // e.g., 2025-11
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function ShowCard({ show }: { show: any }) {
  const dt = parseDate(show.Date, show.Time);
  const nice = dt ? formatNice(dt) : `${show.Date} ${show.Time}`;
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
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
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

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('all'); // e.g., "2025-11"
  const [selectedCity, setSelectedCity] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (DEMO_MODE) return; // using live sheet
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
    const src = data;
    const now = new Date();
  
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
    // keep rows that at least have a Date
    .filter((r) => r.Date)
    // OPTIONAL: only drop clearly past shows *if* we can parse them
    .filter((r) => {
      const dt = r.Time ? parseDate(r.Date, r.Time) : null;
      if (!dt) return true; // if we can’t parse, don’t throw it out
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
      Devin: normalize(src.Devin),
      Pat: normalize(src.Pat),
      Matt: normalize(src.Matt),
    };
  }, [data]);

  // Build filter options (months & cities) across all performers
  const filterOptions = useMemo(() => {
    const all = [...normalized.Devin, ...normalized.Pat, ...normalized.Matt];
    const monthsSet = new Set<string>();
    const citiesSet = new Set<string>();
    for (const s of all) {
      const dt = parseDate(s.Date, s.Time);
      if (dt) monthsSet.add(monthKey(dt));
      if (s.City) citiesSet.add(s.City);
    }
    const months = Array.from(monthsSet).sort();
    const cities = Array.from(citiesSet).sort((a, b) => a.localeCompare(b));
    return { months, cities };
  }, [normalized]);

  // Apply filters per column
  const finalData = useMemo(() => {
    function byFilters(arr: any[]) {
      return arr.filter((s) => {
        const dt = parseDate(s.Date, s.Time);
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

      <div className="mt-8 text-xs text-gray-500 space-y-1">
        <p>Update any of the three tabs in Google Sheets and this page will reflect the changes automatically.</p>
        <p>
          Required headers: <span className="font-mono">Date</span>, <span className="font-mono">Time</span>,{' '}
          <span className="font-mono">City</span>, <span className="font-mono">Venue</span>,{' '}
          <span className="font-mono">Ticket</span>. Optional: <span className="font-mono">Status</span> (set to{' '}
          <span className="font-mono">Sold Out</span> to show a badge and disable the link).
        </p>
      </div>
    </div>
  )
          };
