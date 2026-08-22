import { useParams, useNavigate } from 'react-router-dom';
import { useBudget, useTrip } from '../api/trips';
import { formatMoney } from '../api/client';

const CATEGORIES: Array<{ key: 'transportCents' | 'stayCents' | 'activityCents' | 'mealsCents' | 'otherCents'; label: string }> = [
  { key: 'transportCents', label: 'Transport' },
  { key: 'stayCents', label: 'Stay' },
  { key: 'activityCents', label: 'Activities' },
  { key: 'mealsCents', label: 'Meals' },
  { key: 'otherCents', label: 'Other' },
];

function Budget() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { data: trip } = useTrip(tripId);
  const { data: budget, isLoading, isError } = useBudget(tripId);

  if (isLoading) return <p className="p-8 text-muted">Loading budget…</p>;
  if (isError || !budget) return <p className="p-8 text-stamp">Couldn't load the budget for this trip.</p>;

  const { summary, dailyCosts } = budget;
  const maxDaily = Math.max(1, ...dailyCosts.map((d) => d.amountCents));
  const currency = trip?.currencyCode ?? 'INR';

  return (
    <>
      <section className="max-w-[46rem] px-[clamp(1rem,4vw,3rem)] pb-[0.6rem] pt-[clamp(2.6rem,6vw,3.6rem)]">
        <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">
          Home / Budget
        </p>
        <h1 className="my-2 font-display text-[clamp(2rem,4.6vw,3rem)] font-semibold tracking-tight text-ink">
          Where the money's actually going.
        </h1>
        <p className="m-0 leading-relaxed text-muted">
          {trip?.name ?? 'This trip'} · {summary.durationDays} days
          {summary.budgetCapCents ? ` · cap ${formatMoney(summary.budgetCapCents, currency)}` : ''}
        </p>
      </section>

      <section className="mx-auto grid max-w-[68rem] grid-cols-1 gap-[1.1rem] px-[clamp(1rem,4vw,3rem)] py-[clamp(3.4rem,7vw,5.2rem)] lg:grid-cols-[1.3fr_1fr]">
        <article className="grid content-start gap-1 rounded-2xl border border-rail bg-paper p-[1.15rem]">
          <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.08em] text-muted">
            Total planned spend
          </p>
          <strong className="font-display text-[clamp(2rem,5vw,2.8rem)] font-semibold text-ink">
            {formatMoney(summary.totalCents, currency)}
          </strong>
          <p className="mt-1 text-[0.84rem] text-muted">
            Average {formatMoney(summary.avgPerDayCents, currency)} / day across the trip.
          </p>

          <ul className="m-0 mt-[1.1rem] grid list-none gap-2.5 p-0">
            {CATEGORIES.map((cat) => {
              const amount = summary[cat.key];
              const pct = summary.totalCents > 0 ? Math.round((amount / summary.totalCents) * 100) : 0;
              return (
                <li key={cat.key}>
                  <div className="mb-1 flex justify-between gap-3 text-[0.88rem] text-ink">
                    <span>{cat.label}</span>
                    <span className="font-bold">{formatMoney(amount, currency)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-wash-deep">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1f6f5c,#13463a)' }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mb-1 mt-[1.2rem] font-heading text-[0.85rem] font-bold text-ink">
            Daily cost (bars in amber are over the daily-average cap)
          </p>
          <div className="flex h-24 items-end gap-2 pt-2">
            {dailyCosts.map((bar) => (
              <div key={bar.onDate} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  title={formatMoney(bar.amountCents, currency)}
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, Math.round((bar.amountCents / maxDaily) * 100))}%`,
                    background: bar.overCap ? '#dd9634' : '#1f6f5c',
                  }}
                />
                <span className="text-[0.66rem] text-muted">
                  {new Date(bar.onDate + 'T00:00:00').getDate()}
                </span>
              </div>
            ))}
            {dailyCosts.length === 0 && <p className="text-[0.84rem] text-muted">No costs recorded yet.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-rail bg-paper p-[1.15rem]">
          <h3 className="m-0 mb-3.5 font-heading text-[1.05rem] text-ink">This trip</h3>
          <button
            type="button"
            onClick={() => navigate(`/trips/${tripId}`)}
            className="w-full rounded-full border border-rail bg-paper py-2.5 font-heading text-[0.86rem] font-semibold text-ink"
          >
            Back to itinerary
          </button>
          <p className="mt-3 text-[0.84rem] text-muted">
            Everything here is view-computed on every read — no caching, always current.
          </p>
        </article>
      </section>
    </>
  );
}

export default Budget;
