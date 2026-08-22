import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCities } from '../api/catalog';
import { useAddActivity, useAddStop, useDeleteActivity, useDeleteStop, useTrip } from '../api/trips';
import { formatMoney, ApiError } from '../api/client';
import { computeTripStatus, formatDateRange, STATUS_COLOR } from '../lib/status';

function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const { data: citiesData } = useCities();
  const addStop = useAddStop(tripId!);
  const deleteStop = useDeleteStop(tripId!);
  const addActivity = useAddActivity(tripId!);
  const deleteActivity = useDeleteActivity(tripId!);

  const [addStopOpen, setAddStopOpen] = useState(false);
  const [stopCityId, setStopCityId] = useState('');
  const [stopArrival, setStopArrival] = useState('');
  const [stopDeparture, setStopDeparture] = useState('');
  const [stopError, setStopError] = useState('');

  const [openActivityFor, setOpenActivityFor] = useState<string | null>(null);
  const [activityName, setActivityName] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [activityTime, setActivityTime] = useState('');
  const [activityCost, setActivityCost] = useState('');
  const [activityError, setActivityError] = useState('');

  if (isLoading) return <p className="p-8 text-muted">Loading trip…</p>;
  if (isError || !trip) return <p className="p-8 text-stamp">Couldn't load this trip.</p>;

  const status = computeTripStatus(trip.startDate, trip.endDate);
  const totalCents = trip.stops.reduce(
    (sum, s) =>
      sum + s.stayCents + s.transportInCents + s.activities.reduce((a, act) => a + act.costCents, 0),
    0,
  );

  async function handleAddStop(e: React.FormEvent) {
    e.preventDefault();
    setStopError('');
    if (!stopCityId || !stopArrival || !stopDeparture) {
      setStopError('City, arrival, and departure are all required.');
      return;
    }
    try {
      await addStop.mutateAsync({
        cityId: Number(stopCityId),
        arrivalDate: stopArrival,
        departureDate: stopDeparture,
      });
      setAddStopOpen(false);
      setStopCityId('');
      setStopArrival('');
      setStopDeparture('');
    } catch (err) {
      // STOP_OVERLAP / STOP_OUTSIDE_TRIP land here with a ready-to-show message.
      setStopError(err instanceof ApiError ? err.message : 'Could not add this stop.');
    }
  }

  async function handleAddActivity(stopId: string) {
    setActivityError('');
    if (!activityName.trim() || !activityDate) {
      setActivityError('Activity name and date are required.');
      return;
    }
    try {
      await addActivity.mutateAsync({
        stopId,
        customName: activityName.trim(),
        scheduledDate: activityDate,
        startTime: activityTime || undefined,
        costCents: activityCost ? Math.round(parseFloat(activityCost) * 100) : 0,
      });
      setOpenActivityFor(null);
      setActivityName('');
      setActivityDate('');
      setActivityTime('');
      setActivityCost('');
    } catch (err) {
      // ACTIVITY_OUTSIDE_STOP lands here.
      setActivityError(err instanceof ApiError ? err.message : 'Could not add this activity.');
    }
  }

  return (
    <>
      <section className="max-w-[60rem] px-[clamp(1rem,4vw,3rem)] pb-[0.6rem] pt-[clamp(2.6rem,6vw,3.6rem)]">
        <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">
          Home / My Trips / {trip.name}
        </p>
        <div className="my-2 flex items-center gap-3">
          <h1 className="m-0 font-display text-[clamp(1.8rem,4vw,2.4rem)] font-semibold tracking-tight text-ink">
            {trip.name}
          </h1>
          <span
            className="rounded-full px-[0.6rem] py-[0.2rem] font-heading text-[0.68rem] font-bold uppercase tracking-wide text-white"
            style={{ background: STATUS_COLOR[status] }}
          >
            {status}
          </span>
        </div>
        <p className="m-0 leading-relaxed text-muted">
          {formatDateRange(trip.startDate, trip.endDate)} — drag order coming later; departure date is exclusive,
          so a stop ending the 15th and the next starting the 15th is fine.
        </p>
      </section>

      <section className="mx-auto grid max-w-[76rem] grid-cols-1 gap-[1.4rem] px-[clamp(1rem,4vw,3rem)] py-[1.6rem] pb-[clamp(3.4rem,7vw,5rem)] lg:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-4">
          {trip.stops.map((stop) => (
            <div key={stop.id} className="rounded-2xl border border-rail bg-paper p-[1.1rem]">
              <div className="flex items-center gap-2.5">
                <div className="flex-1">
                  <h3 className="m-0 font-display text-[1.2rem] font-semibold text-ink">
                    {stop.cityName ?? `City #${stop.cityId}`}
                  </h3>
                  <p className="mt-0.5 text-[0.84rem] text-muted">
                    {formatDateRange(stop.arrivalDate, stop.departureDate)}
                  </p>
                </div>
                <button
                  type="button"
                  title="Delete stop"
                  onClick={() => deleteStop.mutate(stop.id)}
                  className="grid h-[2.1rem] w-[2.1rem] place-items-center rounded-full border border-rail bg-paper"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#b2721c" strokeWidth="1.8">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>

              {stop.activities.length > 0 && (
                <ul className="m-0 mt-3.5 grid list-none gap-2 border-t border-dashed border-rail p-0 pt-3.5">
                  {stop.activities.map((act) => (
                    <li
                      key={act.id}
                      className="flex items-center gap-2.5 rounded-lg border border-rail-soft px-2.5 py-2"
                    >
                      <span className="w-[3.4rem] font-heading text-[0.76rem] font-bold text-brand">
                        {act.startTime?.slice(0, 5) ?? ''}
                      </span>
                      <span className="flex-1 text-[0.88rem] text-ink">
                        {act.customName ?? `Activity #${act.activityId}`}
                      </span>
                      <span className="text-[0.78rem] font-semibold text-ink">{formatMoney(act.costCents)}</span>
                      <button
                        type="button"
                        onClick={() => deleteActivity.mutate(act.id)}
                        className="border-0 bg-transparent text-accent"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {openActivityFor === stop.id ? (
                <div className="mt-3 grid gap-2 rounded-xl bg-wash-soft p-3">
                  <input
                    type="text"
                    placeholder="Activity name"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    className="min-h-[2.3rem] rounded-lg border border-rail px-2.5 text-[0.86rem]"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={activityDate}
                      onChange={(e) => setActivityDate(e.target.value)}
                      className="min-h-[2.3rem] rounded-lg border border-rail px-2 text-[0.82rem]"
                    />
                    <input
                      type="time"
                      value={activityTime}
                      onChange={(e) => setActivityTime(e.target.value)}
                      className="min-h-[2.3rem] rounded-lg border border-rail px-2 text-[0.82rem]"
                    />
                    <input
                      type="number"
                      placeholder="Cost ₹"
                      value={activityCost}
                      onChange={(e) => setActivityCost(e.target.value)}
                      className="min-h-[2.3rem] rounded-lg border border-rail px-2 text-[0.82rem]"
                    />
                  </div>
                  {activityError && <p className="m-0 text-[0.78rem] text-stamp">{activityError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddActivity(stop.id)}
                      className="min-h-[2.2rem] rounded-full bg-brand px-3.5 font-heading text-[0.78rem] font-semibold text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenActivityFor(null)}
                      className="min-h-[2.2rem] rounded-full border border-rail bg-paper px-3.5 font-heading text-[0.78rem] font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpenActivityFor(stop.id);
                    setActivityDate(stop.arrivalDate);
                  }}
                  className="mt-3 w-full rounded-lg border border-dashed border-rail py-2 font-heading text-[0.8rem] font-semibold text-muted"
                >
                  + Add activity
                </button>
              )}
            </div>
          ))}

          {addStopOpen ? (
            <form
              onSubmit={handleAddStop}
              className="grid gap-2.5 rounded-2xl border border-dashed border-brand-light bg-paper p-[1.1rem]"
            >
              <label className="grid gap-1 font-heading text-[0.8rem] font-semibold text-ink">
                City
                <select
                  value={stopCityId}
                  onChange={(e) => setStopCityId(e.target.value)}
                  className="min-h-[2.4rem] rounded-lg border border-rail bg-white px-2.5 text-[0.86rem] font-normal"
                >
                  <option value="">Select a city…</option>
                  {(citiesData?.items ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.countryName ? `, ${c.countryName}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="grid gap-1 font-heading text-[0.8rem] font-semibold text-ink">
                  Arrival
                  <input
                    type="date"
                    value={stopArrival}
                    onChange={(e) => setStopArrival(e.target.value)}
                    className="min-h-[2.4rem] rounded-lg border border-rail px-2.5 text-[0.86rem] font-normal"
                  />
                </label>
                <label className="grid gap-1 font-heading text-[0.8rem] font-semibold text-ink">
                  Departure
                  <input
                    type="date"
                    value={stopDeparture}
                    onChange={(e) => setStopDeparture(e.target.value)}
                    className="min-h-[2.4rem] rounded-lg border border-rail px-2.5 text-[0.86rem] font-normal"
                  />
                </label>
              </div>
              {stopError && <p className="m-0 text-[0.78rem] text-stamp">{stopError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addStop.isPending}
                  className="min-h-[2.3rem] rounded-full bg-brand px-4 font-heading text-[0.8rem] font-semibold text-white disabled:opacity-60"
                >
                  {addStop.isPending ? 'Adding…' : 'Add stop'}
                </button>
                <button
                  type="button"
                  onClick={() => setAddStopOpen(false)}
                  className="min-h-[2.3rem] rounded-full border border-rail bg-paper px-4 font-heading text-[0.8rem] font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddStopOpen(true)}
              className="w-full rounded-2xl border border-dashed border-brand-light py-[0.9rem] font-heading text-[0.86rem] font-semibold text-brand"
            >
              + Add stop
            </button>
          )}
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-rail bg-paper p-[1.1rem]">
            <p className="m-0 text-[0.8rem] text-muted">Trip total (est.)</p>
            <strong className="mt-0.5 block font-display text-[1.5rem] text-ink">
              {formatMoney(totalCents, trip.currencyCode)}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="min-h-[2.6rem] rounded-full border border-rail bg-paper font-heading text-[0.86rem] font-semibold text-ink"
          >
            Back to My Trips
          </button>
        </aside>
      </section>
    </>
  );
}

export default TripDetail;
