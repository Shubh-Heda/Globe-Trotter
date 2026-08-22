import { useParams } from 'react-router-dom';
import { useCalendar, useTrip } from '../api/trips';
import { formatMoney } from '../api/client';

function Calendar() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: trip } = useTrip(tripId);
  const { data: days, isLoading, isError } = useCalendar(tripId);

  if (isLoading) return <p className="p-8 text-muted">Loading calendar…</p>;
  if (isError || !days) return <p className="p-8 text-stamp">Couldn't load the calendar for this trip.</p>;

  return (
    <>
      <section className="max-w-[46rem] px-[clamp(1rem,4vw,3rem)] pb-[0.6rem] pt-[clamp(2.6rem,6vw,3.6rem)]">
        <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">
          Home / Calendar
        </p>
        <h1 className="my-2 font-display text-[clamp(2rem,4.6vw,3rem)] font-semibold tracking-tight text-ink">
          {trip?.name ?? 'Trip'} — day by day.
        </h1>
        <p className="m-0 leading-relaxed text-muted">
          Pre-grouped by date. Reorder from the itinerary builder — same endpoint either way.
        </p>
      </section>

      <section className="mx-auto max-w-[52rem] px-[clamp(1rem,4vw,3rem)] py-[1.6rem] pb-[clamp(3.4rem,7vw,5rem)]">
        <div className="grid gap-[1.1rem]">
          {days.map((day) => (
            <div key={day.date} className="grid grid-cols-[5.5rem_1fr] gap-4">
              <div className="pt-0.5 text-right">
                <strong className="font-display text-[1.3rem] text-ink">
                  {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </strong>
              </div>
              <div className="grid gap-2 border-l-2 border-rail pl-[1.1rem]">
                {day.activities.length === 0 && <p className="text-[0.84rem] text-muted">Nothing scheduled.</p>}
                {day.activities.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-rail bg-paper px-[0.9rem] py-2.5"
                  >
                    <span className="w-[3.2rem] font-heading text-[0.82rem] font-bold text-brand">
                      {item.startTime?.slice(0, 5) ?? ''}
                    </span>
                    <span className="flex-1 text-[0.9rem] text-ink">
                      {item.customName ?? `Activity #${item.activityId}`}
                      {item.cityName ? ` · ${item.cityName}` : ''}
                    </span>
                    {item.durationMinutes && (
                      <span className="text-[0.78rem] text-muted">{item.durationMinutes} min</span>
                    )}
                    <span className="text-[0.78rem] font-semibold text-ink">{formatMoney(item.costCents)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {days.length === 0 && <p className="text-muted">No days in range yet — add some stops first.</p>}
        </div>
      </section>
    </>
  );
}

export default Calendar;
