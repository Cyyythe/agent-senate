import Link from "next/link";

export function SiteNav() {
  return (
    <header className="site-nav-wrap">
      <nav className="site-nav">
        <Link href="/" className="nav-brand">
          Agent Senate
        </Link>
        <div className="nav-links">
          <Link href="/ask">Ask Question</Link>
          <Link href="/presets">Preset Questions</Link>
        </div>
      </nav>
    </header>
  );
}
