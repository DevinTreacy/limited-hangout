'use client';
import React, { useEffect, useMemo, useState } from 'react';

/**
 * LIMITED HANGOUT — LIVE SHOWS GRID (v2)
 * Three columns (Devin, Pat, Matt) pulling shows from three Google Sheets tabs.
 */

const SPREADSHEET_ID = '1m2nJyd_UkN0DJtWOtRW1ZbeXX5Xqc-g5XVkwvBvHqUY';
const DEMO_MODE = false;

async function fetchSheetTab(sheetName: string) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
      sheetName
    )}&headers=1&tqx=out:json`;

    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();

    // log what we got
    console.log(`Response for ${sheetName} tab:`, text.slice(0, 300));

    // unwrap gviz JSON
    const json = JSON.parse(
      text.replace(/^.*setResponse\(/, '').replace(/\);\s*$/, '')
    );

    const table = json.table;
    if (!table || !table.cols || !table.rows) {
      console.warn(`No data found for ${sheetName}`);
      return [];
    }

    const headers = table.cols.map((c: any) => (c && c.label ? c.label.trim() : ''));

    const rows = table.rows
      .map((r: any) => r.c)
      .filter(Boolean)
      .map((cells: any[]) => {
        const obj: Record<string, string> = {};
        headers.forEach((h: string, i: number) => {
          const cell = cells[i];
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

function normalizeDateText(input: string) {
  if (!input) return input;
  const trimmed = input.trim();

  const m = /^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})/.exec(trimmed);
  if (m) {
    const [_, y, mth, d] = m;
    return `${y}-${pad2(Number(mth) + 1)}-${pad2(d)}`;
  }

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
        .filter((r) => r.Date) // only require date
        .filter((r) => {
          // only drop past shows if we can parse
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
    const all = [...normalized.Devi

::contentReference[oaicite:0]{index=0}
