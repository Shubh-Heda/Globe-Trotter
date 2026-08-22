import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useDashboard } from '../api/trips';
import { formatMoney } from '../api/client';
import { STATUS_COLOR, formatDateRange } from '../lib/status';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <li className="flex flex-col gap-1 border border-rail bg-paper px-[1.1rem] py-[0.9rem] first:rounded-l-xl last:rounded-r-xl">
      <span className="font-heading text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <strong className="font-display text-[1.4rem] font-semibold text-ink">{value}</strong>
    </li>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();

  const firstName = data?.user.fullName?.split(' ')[0] ?? 'traveler';
  const totalStops = data?.recentTrips.reduce((sum, t) => sum + t.stopCount, 0) ?? 0;

  return (
    <>
      <section className="relative grid min-h-[min(58svh,30rem)] content-end px-[clamp(1rem,4vw,3rem)]">
        <div className="absolute inset-0">
          <img
            className="h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1559041305-e578b0a60b66?auto=format&fit=crop&w=1600&q=80"
            alt="Himalayan peaks"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(0deg, rgba(9,16,15,0.92) 0%, rgba(10,18,17,0.5) 46%, rgba(10,18,17,0.18) 100%)',
            }}
          />
        </div>
        <div className="relative z-10 grid max-w-[42rem] gap-4 py-[clamp(2.2rem,6vw,3.4rem)]">
          <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-[#cfe6dc]">
            Home / Dashboard
          </p>
          <h1 className="m-0 font-display text-[clamp(2.4rem,6.4vw,3.6rem)] font-semibold leading-none tracking-tight text-[#fdfffd]">
            Welcome back, {firstName}.
          </h1>
          <p className="m-0 max-w-[52ch] text-[1.03rem] leading-[1.7] text-[#dfeae4]">
            Your personalized travel overview. Jump into a trip, check the budget, or go hunting for the next
            destination.
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="flex min-h-[2.5rem] items-center gap-1.5 rounded-full bg-cta px-5 font-heading text-[0.85rem] font-semibold text-white shadow-[0_10px_22px_rgba(178,114,28,0.28)]"
            >
              <Sparkles size={15} /> Plan with AI
            </button>
            <button
              type="button"
              onClick={() => navigate('/trips')}
              className="min-h-[2.5rem] rounded-full border border-white/40 px-5 font-heading text-[0.85rem] font-semibold text-white"
            >
              View all trips
            </button>
            <button
              type="button"
              onClick={() => navigate('/trips/new')}
              className="min-h-[2.5rem] rounded-full border border-white/40 px-5 font-heading text-[0.85rem] font-semibold text-white"
            >
              Plan manually
            </button>
          </div>
        </div>
      </section>

      <section className="px-[clamp(1rem,4vw,3rem)] py-[clamp(4rem,8vw,5.4rem)]">
        {isError && (
          <p className="mb-6 text-stamp">Couldn't load your dashboard. Try refreshing.</p>
        )}

        <ul className="mb-8 grid max-w-[44rem] grid-cols-3 list-none gap-0 p-0">
          <StatCard label="Active trips" value={isLoading ? '—' : data?.recentTrips.length ?? 0} />
          <StatCard label="Total stops" value={isLoading ? '—' : totalStops} />
          <StatCard label="Budget cap status" value="On track" />
        </ul>

        <div className="mx-auto grid max-w-[76rem] grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-rail bg-paper p-[1.15rem] shadow-[0_10px_26px_rgba(17,36,31,0.05)]">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h3 className="m-0 font-heading text-[1.05rem] text-ink">Recent trips</h3>
              <button type="button" onClick={() => navigate('/trips')} className="text-[0.82rem] font-semibold text-brand">
                See all →
              </button>
            </div>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {(data?.recentTrips ?? []).slice(0, 2).map((trip) => (
                <li key={trip.id} className="grid grid-cols-[3.4rem_1fr] items-center gap-2.5 rounded-xl border border-rail p-2">
                  {trip.coverImagePath ? (
                    <img src={trip.coverImagePath} alt="" className="h-[3.4rem] w-[3.4rem] rounded-lg object-cover" />
                  ) : (
                    <div className="h-[3.4rem] w-[3.4rem] rounded-lg bg-wash-deep" />
                  )}
                  <div>
                    <p className="m-0 text-[0.68rem] font-bold uppercase tracking-wide" style={{ color: STATUS_COLOR[trip.status] }}>
                      {trip.status}
                    </p>
                    <h4 className="my-0.5 text-[0.92rem] text-ink">{trip.name}</h4>
                    <p className="m-0 text-[0.8rem] text-muted">{formatDateRange(trip.startDate, trip.endDate)}</p>
                  </div>
                </li>
              ))}
              {!isLoading && data?.recentTrips.length === 0 && (
                <li className="text-[0.88rem] text-muted">No trips yet — plan your first one.</li>
              )}
            </ul>
          </article>

          <article className="rounded-2xl border border-rail bg-paper p-[1.15rem] shadow-[0_10px_26px_rgba(17,36,31,0.05)]">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h3 className="m-0 font-heading text-[1.05rem] text-ink">Recommended for you</h3>
            </div>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {(data?.recommendedCities ?? []).slice(0, 2).map((dest) => (
                <li key={dest.id} className="grid grid-cols-[3.4rem_1fr] items-center gap-2.5 rounded-xl border border-rail p-2">
                  {dest.imagePath ? (
                    <img src={dest.imagePath} alt="" className="h-[3.4rem] w-[3.4rem] rounded-lg object-cover" />
                  ) : (
                    <div className="h-[3.4rem] w-[3.4rem] rounded-lg bg-wash-deep" />
                  )}
                  <div>
                    <h4 className="m-0 text-[0.92rem] text-ink">{dest.name}</h4>
                    <p className="mt-0.5 text-[0.8rem] text-muted">{dest.countryName}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-rail bg-paper p-[1.15rem] shadow-[0_10px_26px_rgba(17,36,31,0.05)]">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h3 className="m-0 font-heading text-[1.05rem] text-ink">Budget snapshot</h3>
            </div>
            <div className="rounded-xl border border-rail bg-wash-soft p-[0.85rem]">
              <p className="m-0 text-[0.84rem] text-muted">Total planned spend</p>
              <strong className="mt-1 block font-display text-[1.6rem] font-semibold text-ink">
                {formatMoney(data?.budgetHighlight?.totalCents ?? 0)}
              </strong>
            </div>
            <p className="mt-2.5 text-[0.84rem] text-muted">
              Across {data?.recentTrips.length ?? 0} trips currently in motion.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}

export default Dashboard;
