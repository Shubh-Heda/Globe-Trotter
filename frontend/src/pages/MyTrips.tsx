import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteTrip, useTrips } from '../api/trips';
import { formatMoney } from '../api/client';
import { STATUS_COLOR, formatDateRange } from '../lib/status';
import type { TripStatus } from '../api/types';

const filters: Array<TripStatus | 'ALL'> = ['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED'];

function MyTrips() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('ALL');
  const { data, isLoading, isError } = useTrips(activeFilter === 'ALL' ? undefined : activeFilter);
  const deleteTrip = useDeleteTrip();

  const trips = data?.items ?? [];

  function handleDelete(tripId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    deleteTrip.mutate(tripId);
  }

  return (
    <>
      <section className="max-w-[46rem] px-[clamp(1rem,4vw,3rem)] pb-[0.6rem] pt-[clamp(2.6rem,6vw,3.6rem)]">
        <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">
          Home / My Trips
        </p>
        <h1 className="my-2 font-display text-[clamp(2rem,4.6vw,3rem)] font-semibold tracking-tight text-ink">
          Every trip you've got in motion.
        </h1>
        <p className="m-0 leading-relaxed text-muted">Upcoming, ongoing, and the ones already wrapped.</p>
      </section>

      <section className="px-[clamp(1rem,4vw,3rem)] py-[clamp(3.4rem,7vw,5.2rem)]">
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`rounded-full border px-[0.95rem] py-[0.42rem] font-heading text-[0.82rem] font-semibold ${
                activeFilter === f ? 'border-brand bg-brand text-white' : 'border-rail bg-paper text-ink'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {isError && <p className="text-stamp">Couldn't load your trips. Try refreshing.</p>}
        {isLoading && <p className="text-muted">Loading trips…</p>}

        <ul className="m-0 grid list-none gap-[1.1rem] p-0">
          {trips.map((trip) => (
            <li
              key={trip.id}
              className="grid grid-cols-[12rem_auto_1fr] overflow-hidden rounded-2xl border border-rail bg-paper"
            >
              <div className="relative">
                {trip.coverImagePath ? (
                  <img src={trip.coverImagePath} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-wash-deep" />
                )}
                <span
                  className="absolute left-[0.7rem] top-[0.7rem] rounded-full px-[0.6rem] py-[0.25rem] font-heading text-[0.68rem] font-bold uppercase tracking-wide text-white"
                  style={{ background: STATUS_COLOR[trip.status] }}
                >
                  {trip.status}
                </span>
              </div>
              <div className="w-px border-l-2 border-dashed border-rail" />
              <div className="grid content-between gap-3 p-[1.1rem_1.3rem]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="m-0 font-heading text-[0.68rem] font-bold uppercase tracking-wide text-muted">
                      Itinerary
                    </p>
                    <h3 className="my-0.5 font-display text-[1.35rem] font-semibold text-ink">{trip.name}</h3>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <p className="m-0 font-heading text-[0.68rem] font-bold uppercase tracking-wide text-muted">
                      Dates
                    </p>
                    <p className="mt-0.5 text-[0.9rem] font-semibold text-ink">
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="m-0 font-heading text-[0.68rem] font-bold uppercase tracking-wide text-muted">
                      Stops
                    </p>
                    <p className="mt-0.5 text-[0.9rem] font-semibold text-ink">{trip.stopCount}</p>
                  </div>
                  <div>
                    <p className="m-0 font-heading text-[0.68rem] font-bold uppercase tracking-wide text-muted">
                      Total
                    </p>
                    <p className="mt-0.5 text-[0.9rem] font-semibold text-ink">
                      {formatMoney(trip.totalCents, trip.currencyCode)}
                    </p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => handleDelete(trip.id, trip.name)}
                      className="grid h-[2.35rem] w-[2.35rem] place-items-center rounded-full border border-rail bg-paper"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#b2721c" strokeWidth="1.8">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="rounded-full border border-rail bg-paper px-4 font-heading text-[0.82rem] font-semibold text-ink"
                    >
                      Open itinerary
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!isLoading && trips.length === 0 && (
          <div className="grid justify-items-center gap-3 py-12 text-center text-muted">
            <p className="m-0 font-display text-[1.3rem] text-ink">
              Nothing filed under "{activeFilter === 'ALL' ? 'All' : activeFilter}" yet.
            </p>
            <button
              type="button"
              onClick={() => navigate('/trips/new')}
              className="min-h-[2.5rem] rounded-full bg-cta px-5 font-heading text-[0.85rem] font-semibold text-white"
            >
              Plan your first trip
            </button>
          </div>
        )}
      </section>
    </>
  );
}

export default MyTrips;
