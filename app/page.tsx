
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="card">
        <h1 className="h1 mb-4">Limited Hangout</h1>
        <p className="muted mb-6">Sketches, stand-up, and live shows.</p>
        <div className="flex gap-3">
          <Link className="btn" href="/videos">Watch Videos</Link>
          <Link className="btn" href="/shows">See Live Shows</Link>
        </div>
      </section>
    </div>
  );
}
