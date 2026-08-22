import { Link } from 'react-router-dom';

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-rail bg-paper p-6 shadow-[0_10px_26px_rgba(17,36,31,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(17,36,31,0.10)]">
      <div className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-wash-deep text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
        {icon}
      </div>
      <h3 className="mb-2 font-heading text-[1.05rem] font-semibold text-ink">{title}</h3>
      <p className="m-0 text-[0.9rem] leading-relaxed text-muted">{description}</p>
    </article>
  );
}

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="m-0 font-display text-[2rem] font-semibold text-white">{value}</p>
      <p className="m-0 mt-0.5 font-heading text-[0.78rem] font-medium uppercase tracking-wider text-[#cfe6dc]">{label}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-wash text-ink">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-30 border-b border-rail bg-wash/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[76rem] items-center justify-between px-5 py-3">
          <Link to="/" className="inline-flex items-center gap-2.5 no-underline">
            <span className="grid h-[2.15rem] w-[2.15rem] place-items-center rounded-full bg-brand-gradient text-white shadow-[0_6px_16px_rgba(19,70,58,0.32)]">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="m8.2 15.6 2.1-5.3 5.3-2.1-2.1 5.3z" />
              </svg>
            </span>
            <span className="font-display text-[1.32rem] font-semibold tracking-tight text-ink">TripCraft</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-rail bg-paper px-5 py-2 font-heading text-[0.85rem] font-semibold text-ink no-underline transition-colors hover:bg-wash-deep"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-cta px-5 py-2 font-heading text-[0.85rem] font-semibold text-white no-underline shadow-[0_10px_22px_rgba(178,114,28,0.28)] transition-transform hover:scale-[1.03]"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            className="h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1491738726357-683388052ea6?auto=format&fit=crop&w=2000&q=80"
            alt="Aerial view of boats anchored off a white-sand tropical beach in turquoise water"
          />
          <div className="absolute inset-0 bg-brand-gradient opacity-80" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-[76rem] gap-8 px-5 py-[clamp(4rem,10vw,7rem)] lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-12">
          <div className="max-w-[36rem]">
            <p className="mb-4 inline-block rounded-full border border-white/15 bg-white/10 px-4 py-1.5 font-heading text-[0.78rem] font-bold uppercase tracking-[0.16em] text-[#cfe6dc]">
              Multi-city trip planner
            </p>
            <h1 className="mb-5 font-display text-[clamp(2.4rem,6vw,3.6rem)] font-semibold leading-[1.1] tracking-tight text-white">
              Plan every city.<br />
              <span className="text-accent-light">Track every cost.</span>
            </h1>
            <p className="mb-8 max-w-[44ch] text-[1.08rem] leading-[1.7] text-[#c8dcd4]">
              Routes, budgets, and activities — all laid out in one itinerary you'd actually trust. No more six scattered tabs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex min-h-[3rem] items-center rounded-full bg-cta px-7 font-heading text-[0.92rem] font-semibold text-white no-underline shadow-[0_10px_22px_rgba(178,114,28,0.28)] transition-transform hover:scale-[1.03]"
              >
                Start planning — it's free
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-[3rem] items-center rounded-full border border-white/20 bg-white/10 px-7 font-heading text-[0.92rem] font-semibold text-white no-underline backdrop-blur transition-colors hover:bg-white/15"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Stats cluster */}
          <div className="flex items-center justify-center">
            <div className="grid grid-cols-2 gap-5 rounded-2xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-sm">
              <StatBadge value="∞" label="Cities" />
              <StatBadge value="$0" label="Cost to use" />
              <StatBadge value="24/7" label="Access" />
              <StatBadge value="1" label="Itinerary" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="mx-auto max-w-[76rem] px-5 py-[clamp(4rem,10vw,6rem)]">
        <div className="mb-10 max-w-[32rem]">
          <p className="mb-2 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-accent">
            Everything you need
          </p>
          <h2 className="mb-3 font-display text-[clamp(1.8rem,4vw,2.4rem)] font-semibold leading-tight text-ink">
            Your trip, crafted to perfection
          </h2>
          <p className="m-0 text-[1rem] leading-relaxed text-muted">
            From the first city to the final flight, TripCraft keeps your plans clear, your budget honest, and your itinerary shareable.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            title="Multi-city stops"
            description="Add as many cities as your trip needs. Set arrival and departure dates with automatic overlap detection."
          />
          <FeatureCard
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
            title="Live budget tracking"
            description="Every activity rolls up into a real-time cost breakdown by stop, by category, and by trip — no spreadsheet needed."
          />
          <FeatureCard
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            title="Day-by-day activities"
            description="Attach activities to specific days within each stop. See what's happening every single day at a glance."
          />
          <FeatureCard
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16,6 12,2 8,6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
            }
            title="Public sharing"
            description="Publish a read-only link for friends to browse your trip — or let them copy it as their own starting point."
          />
          <FeatureCard
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            }
            title="Activity catalog"
            description="Browse from a curated catalog of activities per city — or add your own custom entries. No external API needed."
          />
          <FeatureCard
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="Collaborative (coming soon)"
            description="Real-time updates via WebSocket keep everyone on the same page as the trip evolves."
          />
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="mx-5 mb-12 rounded-2xl bg-brand-gradient px-5 py-[clamp(3rem,7vw,4.5rem)]">
        <div className="mx-auto max-w-[36rem] text-center">
          <h2 className="mb-3 font-display text-[clamp(1.8rem,4vw,2.4rem)] font-semibold text-white">
            Ready to plan your next trip?
          </h2>
          <p className="mb-6 text-[1rem] leading-relaxed text-[#c8dcd4]">
            Create an account in seconds. No credit card, no catch — just better travel planning.
          </p>
          <Link
            to="/signup"
            className="inline-flex min-h-[3rem] items-center rounded-full bg-cta px-8 font-heading text-[0.92rem] font-semibold text-white no-underline shadow-[0_10px_22px_rgba(178,114,28,0.28)] transition-transform hover:scale-[1.03]"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-rail bg-wash-deep px-6 py-6">
        <div className="mx-auto flex max-w-[68rem] flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-2.5">
            <span className="grid h-[1.8rem] w-[1.8rem] place-items-center rounded-full bg-brand-gradient text-white">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="m8.2 15.6 2.1-5.3 5.3-2.1-2.1 5.3z" />
              </svg>
            </span>
            <span className="font-display text-[1.05rem] font-semibold text-ink">TripCraft</span>
          </div>
          <p className="m-0 text-[0.86rem] text-muted">Plan it, track it, actually go.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
