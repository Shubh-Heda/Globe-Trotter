import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTrip } from '../api/trips';
import { ApiError } from '../api/client';

function CreateTrip() {
  const navigate = useNavigate();
  const createTrip = useCreateTrip();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [budgetCap, setBudgetCap] = useState('');

  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');
  const [formError, setFormError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError('');
    setDateError('');
    setFormError('');

    const trimmedName = name.trim();
    let hasError = false;

    // Mirrors backend/app/modules/trips/schemas.py TripCreate validation.
    if (trimmedName.length < 1 || trimmedName.length > 120) {
      setNameError('Trip name must be 1–120 characters.');
      hasError = true;
    }
    if (!startDate || !endDate) {
      setDateError('Start and end dates are required.');
      hasError = true;
    } else if (endDate < startDate) {
      setDateError("End date must be on or after the start date.");
      hasError = true;
    } else {
      const spanDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000;
      if (spanDays > 365) {
        setDateError('Trips can span at most 365 days.');
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      const trip = await createTrip.mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
        startDate,
        endDate,
        currencyCode,
        budgetCapCents: budgetCap ? Math.round(parseFloat(budgetCap) * 100) : undefined,
      });
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        for (const { field, issue } of err.details) {
          if (field === 'name') setNameError(issue);
          else if (field === 'startDate' || field === 'endDate' || field === '') setDateError(issue);
        }
        setFormError(err.message);
      } else {
        setFormError("We couldn't create your trip. Please try again.");
      }
    }
  }

  return (
    <>
      <section className="max-w-[46rem] px-[clamp(1rem,4vw,3rem)] pb-[0.6rem] pt-[clamp(2.6rem,6vw,3.6rem)]">
        <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">
          New itinerary
        </p>
        <h1 className="my-2 font-display text-[clamp(2rem,4.6vw,2.6rem)] font-semibold tracking-tight text-ink">
          Start a new trip.
        </h1>
        <p className="m-0 leading-relaxed text-muted">
          You'll add stops and activities once the trip exists — this just sets the frame.
        </p>
      </section>

      <section className="px-[clamp(1rem,4vw,3rem)] py-[1.6rem] pb-[clamp(3.4rem,7vw,5rem)]">
        <form
          onSubmit={handleSubmit}
          className="grid max-w-[46rem] gap-[1.2rem] rounded-2xl border border-rail bg-paper p-[1.6rem]"
        >
          {formError && <p className="m-0 text-stamp">{formError}</p>}

          <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
            Trip name
            <input
              type="text"
              placeholder="Kerala Backwaters Escape"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[2.6rem] rounded-lg border border-rail px-[0.9rem] text-[0.92rem] font-normal"
            />
            {nameError ? (
              <span className="text-[0.76rem] text-stamp">{nameError}</span>
            ) : (
              <span className="text-[0.76rem] text-muted">1–120 characters</span>
            )}
          </label>

          <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
            Description <span className="font-normal text-muted">(optional)</span>
            <textarea
              placeholder="A slow loop through the backwaters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[4.2rem] resize-y rounded-lg border border-rail px-[0.9rem] py-[0.6rem] text-[0.92rem] font-normal"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="min-h-[2.6rem] rounded-lg border border-rail px-[0.9rem] text-[0.92rem] font-normal"
              />
            </label>
            <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              End date
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="min-h-[2.6rem] rounded-lg border border-rail px-[0.9rem] text-[0.92rem] font-normal"
              />
            </label>
          </div>
          {dateError ? (
            <p className="-mt-2.5 m-0 text-[0.76rem] text-stamp">{dateError}</p>
          ) : (
            <p className="-mt-2.5 m-0 text-[0.76rem] text-muted">
              End date can't be before start date; trip span is capped at 365 days.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Currency
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="min-h-[2.6rem] rounded-lg border border-rail bg-white px-[0.9rem] text-[0.92rem] font-normal"
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </label>
            <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Budget cap <span className="font-normal text-muted">(optional)</span>
              <input
                type="number"
                min="0"
                placeholder="90000"
                value={budgetCap}
                onChange={(e) => setBudgetCap(e.target.value)}
                className="min-h-[2.6rem] rounded-lg border border-rail px-[0.9rem] text-[0.92rem] font-normal"
              />
            </label>
          </div>

          <div className="mt-1 flex gap-2.5">
            <button
              type="submit"
              disabled={createTrip.isPending}
              className="min-h-[2.7rem] rounded-full bg-cta px-[1.4rem] font-heading text-[0.9rem] font-semibold text-white shadow-[0_10px_22px_rgba(178,114,28,0.28)] disabled:opacity-60"
            >
              {createTrip.isPending ? 'Creating…' : 'Create trip'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/trips')}
              className="min-h-[2.7rem] rounded-full border border-rail bg-paper px-5 font-heading text-[0.9rem] font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

export default CreateTrip;
