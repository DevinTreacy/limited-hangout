
import { NextResponse } from "next/server";

type Row = [string, string, string, string, string?];

export async function GET() {
  const demo = (process.env.DEMO_MODE || "false").toLowerCase() === "true";
  const key = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE || "Shows!A:E";

  if (demo || !key || !sheetId) {
    const members = [
      {
        name: "Devin",
        shows: [
          { date: "2025-11-01", time: "8:00 PM", venue: "DC Improv", link: "https://tickets.example.com/devin1" },
          { date: "2025-11-08", time: "7:30 PM", venue: "Hotbed DC", link: "https://tickets.example.com/devin2" }
        ]
      },
      {
        name: "Matt",
        shows: [
          { date: "2025-11-03", time: "7:30 PM", venue: "Hotbed DC", link: "https://tickets.example.com/matt1" }
        ]
      },
      {
        name: "Pat",
        shows: [
          { date: "2025-11-05", time: "9:00 PM", venue: "Arlington Drafthouse", link: "https://tickets.example.com/pat1" }
        ]
      }
    ];
    return NextResponse.json({ members });
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${key}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Sheets fetch failed: ${text}` }, { status: 502 });
  }

  const data = await res.json() as { values?: Row[] };
  const rows = data.values || [];
  const header = rows[0] || [];
  const body = rows.slice(1);

  const [hMember] = header;
  if ((hMember||"").toLowerCase() !== "member") {
    return NextResponse.json({ error: "First row must be headers: member,date,time,venue,link" }, { status: 400 });
  }

  const items = body
    .filter(r => r && r.length >= 4)
    .map(r => {
      const [member, date, time, venue, link] = r;
      return { member, date, time, venue, link: link || "" };
    });

  const groups: Record<string, { date: string; time: string; venue: string; link: string }[]> = {};
  for (const it of items) {
    const k = (it.member || "").trim();
    if (!groups[k]) groups[k] = [];
    groups[k].push({ date: it.date, time: it.time, venue: it.venue, link: it.link });
  }

  for (const m of Object.keys(groups)) {
    groups[m].sort((a, b) => a.date.localeCompare(b.date));
  }

  const membersOrdered = ["Devin", "Matt", "Pat"].map(name => ({
    name,
    shows: groups[name] || []
  }));

  return NextResponse.json({ members: membersOrdered });
}
