import { useNavigate, useParams } from 'react-router-dom';
import { useSessionStore } from '../stores/session';
import { useCopyTrip, usePublicTrip } from '../api/trips';
import { ApiError } from '../api/client';

function PublicTrip() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const token = useSessionStore((s) => s.token);
  const { data: trip, isLoading, isError } = usePublicTrip(slug);
  const copyTrip = useCopyTrip();

  if (isLoading) return <p className="p-8 text-muted">Loading trip…</p>;
  if (isError || !trip) return <p className="p-8 text-stamp">This trip isn't published, or the link is wrong.</p>;

  async function handleCopy() {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const copied = await copyTrip.mutateAsync(slug!);
      navigate(`/trips/${copied.id}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Couldn't copy this trip.");
    }
  }

  return (
    <>
      <section className="relative grid min-h-[min(52svh,26rem)] content-end px-[clamp(1rem,4vw,3rem)]">
        <div className="absolute inset-0">
          {trip.coverImagePath && (
            <img src={trip.coverImagePath} alt="" className="h-full w-full object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(0deg, rgba(9,16,15,0.92) 0%, rgba(10,18,17,0.5) 46%, rgba(10,18,17,0.18) 100%)',
            }}
          />
        </div>
        <div className="relative z-10 grid max-w-[42rem] gap-3 py-[clamp(2.2rem,6vw,3rem)]">
          <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-[#cfe6dc]">
            Public itinerary
          </p>
          <h1 className="m-0 font-display text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.05] text-[#fdfffd]">
            {trip.name}
          </h1>
          <p className="m-0 text-[1rem] text-[#dfeae4]">
            {trip.startDate} – {trip.endDate}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[70rem] grid-cols-1 gap-[1.4rem] px-[clamp(1rem,4vw,3rem)] py-[1.6rem] pb-[clamp(3.4rem,7vw,5rem)] lg:grid-cols-[1fr_18rem]">
        <div className="grid content-start gap-[1.2rem]">
          {trip.stops.map((stop) => (
            <div key={stop.id} className="relative border-l-2 border-dashed border-rail pl-[1.6rem]">
              <span className="absolute left-[-0.42rem] top-[0.15rem] h-3 w-3 rounded-full border-2 border-white bg-brand-light shadow-[0_0_0_1px_#d9e1d8]" />
              <h3 className="m-0 font-display text-[1.1rem] font-semibold text-ink">
                {stop.cityName ?? `City #${stop.cityId}`}
              </h3>
              <p className="mb-2.5 mt-0.5 text-[0.84rem] text-muted">
                {stop.arrivalDate} – {stop.departureDate}
              </p>
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {stop.activities.map((act) => (
                  <li key={act.id} className="flex gap-2.5 text-[0.85rem] text-ink">
                    <span className="text-muted">{act.startTime?.slice(0, 5) ?? ''}</span>
                    <span>{act.customName ?? `Activity #${act.activityId}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <aside className="grid content-start gap-[0.9rem]">
          <div className="rounded-2xl border border-rail bg-paper p-[1.1rem] text-center">
            <p className="mb-2.5 mt-0 text-[0.84rem] text-muted">Like this route?</p>
            <button
              type="button"
              onClick={handleCopy}
              disabled={copyTrip.isPending}
              className="min-h-[2.6rem] w-full rounded-full bg-cta font-heading text-[0.86rem] font-semibold text-white disabled:opacity-60"
            >
              {copyTrip.isPending ? 'Copying…' : 'Copy this trip'}
            </button>
            <p className="mt-2.5 text-[0.74rem] text-muted">
              Requires an account — you'll land back here after logging in.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(token ? '/' : '/login')}
            className="min-h-[2.5rem] rounded-full border border-rail bg-paper font-heading text-[0.84rem] font-semibold text-ink"
          >
            Plan your own trip
          </button>
        </aside>
      </section>
    </>
  );
}

export default PublicTrip;
