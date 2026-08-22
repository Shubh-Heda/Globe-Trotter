import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/session';

const navLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/trips', label: 'My Trips', end: false },
];

function BrandMark() {
  return (
    <span className="grid h-[2.15rem] w-[2.15rem] place-items-center rounded-full bg-brand-gradient text-white shadow-[0_6px_16px_rgba(19,70,58,0.32)]">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.2 15.6 2.1-5.3 5.3-2.1-2.1 5.3z" />
      </svg>
    </span>
  );
}

function Layout() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);

  const initial = user?.fullName?.trim()?.[0]?.toUpperCase() ?? '?';

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-wash text-ink">
      <header className="sticky top-0 z-30 grid min-h-[4.4rem] grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-rail bg-wash/95 px-5 backdrop-blur">
        <button
          type="button"
          className="inline-flex items-center gap-2.5"
          onClick={() => navigate('/')}
          aria-label="GlobeTrotter dashboard"
        >
          <BrandMark />
          <span className="font-display text-[1.32rem] font-semibold tracking-tight text-ink">
            GlobeTrotter
          </span>
        </button>

        <nav className="flex items-center justify-center gap-6 font-heading" aria-label="Primary">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `border-b-2 pb-1 text-[0.88rem] font-medium tracking-wide no-underline ${
                  isActive ? 'border-accent text-ink' : 'border-transparent text-muted'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            title="Profile"
            onClick={() => navigate('/profile')}
            className="grid h-[2.4rem] w-[2.4rem] place-items-center rounded-full border border-rail bg-paper font-heading font-bold text-ink"
          >
            {initial}
          </button>
          <button
            type="button"
            title="Log out"
            onClick={handleLogout}
            className="grid h-[2.4rem] w-[2.4rem] place-items-center rounded-full border border-rail bg-paper"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#5c6f69" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => navigate('/trips/new')}
            className="min-h-[2.5rem] rounded-full bg-cta px-[1.1rem] font-heading text-[0.85rem] font-semibold text-white shadow-[0_10px_22px_rgba(178,114,28,0.28)]"
          >
            Plan new trip
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-rail bg-wash-deep px-6 py-6">
        <div className="mx-auto flex max-w-[68rem] flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-2.5">
            <span className="grid h-[1.8rem] w-[1.8rem] place-items-center rounded-full bg-brand-gradient text-white">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="m8.2 15.6 2.1-5.3 5.3-2.1-2.1 5.3z" />
              </svg>
            </span>
            <span className="font-display text-[1.05rem] font-semibold text-ink">GlobeTrotter</span>
          </div>
          <p className="m-0 text-[0.86rem] text-muted">Plan it, track it, actually go.</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
