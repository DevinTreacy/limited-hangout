
import { group, individuals } from "@/data/socials";

export default function SocialsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="h1">Socials</h1>

      <section className="card">
        <h2 className="h2 mb-3">Group</h2>
        <div className="flex flex-wrap gap-3">
          {group.map((g, i) => (
            <a key={i} href={g.url} target="_blank" rel="noreferrer" className="btn">{g.label}</a>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {individuals.map((p, i) => (
          <div className="card" key={i}>
            <h3 className="text-xl font-semibold mb-2">{p.name}</h3>
            <div className="flex flex-wrap gap-3">
              {p.links.map((l, j) => (
                <a key={j} href={l.url} target="_blank" rel="noreferrer" className="btn">{l.label}</a>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
