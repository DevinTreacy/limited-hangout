
async function getShows() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/shows`, {
    cache: "no-store"
  }).catch(() => null);

  const rel = !res ? await fetch("/api/shows", { cache: "no-store" }) : res;
  if (!rel.ok) {
    return { members: [
      { name: "Devin", shows: [] },
      { name: "Matt", shows: [] },
      { name: "Pat", shows: [] },
    ]};
  }
  return rel.json();
}

export default async function ShowsPage() {
  const data = await getShows();

  return (
    <div className="grid gap-6">
      <h1 className="h1">Live Shows</h1>
      <p className="muted">Auto-updating from Google Sheets (or demo mode).</p>

      <div className="grid md:grid-cols-3 gap-6">
        {data.members.map((m: any) => (
          <div key={m.name} className="card">
            <h2 className="h2 mb-4">{m.name}</h2>
            {m.shows.length === 0 ? (
              <div className="muted">No upcoming dates yet. Check back soon.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left muted">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Time</th>
                    <th className="py-2">Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {m.shows.map((s: any, i: number) => (
                    <tr key={i} className="border-t border-white/10">
                      <td className="py-2">{s.date}</td>
                      <td className="py-2">{s.time}</td>
                      <td className="py-2">
                        {s.link ? (
                          <a href={s.link} target="_blank" rel="noreferrer">{s.venue}</a>
                        ) : s.venue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs muted">
        Admin tip: add rows in the Google Sheet and they’ll appear here automatically.
      </div>
    </div>
  );
}
