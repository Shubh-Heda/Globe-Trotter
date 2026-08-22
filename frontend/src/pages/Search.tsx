import { useState } from 'react';
import { useActivityCategories, useActivitySearch, useCitySearch } from '../api/catalog';
import { formatMoney } from '../api/client';

type Tab = 'cities' | 'activities';

function Search() {
  const [tab, setTab] = useState<Tab>('cities');
  const [citySort, setCitySort] = useState<'popularity' | 'cost'>('popularity');
  const [activityQuery, setActivityQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  const { data: cityData, isLoading: citiesLoading } = useCitySearch({ sort: citySort });
  const { data: categories } = useActivityCategories();
  const { data: activityData, isLoading: activitiesLoading } = useActivitySearch({
    q: activityQuery,
    categoryId,
  });

  return (
    <>
      <section className="max-w-[46rem] px-[clamp(1rem,4vw,3rem)] pb-[0.6rem] pt-[clamp(2.6rem,6vw,3.6rem)]">
        <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">
          Home / Explore
        </p>
        <h1 className="my-2 font-display text-[clamp(2rem,4.6vw,3rem)] font-semibold tracking-tight text-ink">
          The shortlist worth boarding for.
        </h1>
        <p className="m-0 leading-relaxed text-muted">
          Ranked by real cost and popularity data, not who paid for placement.
        </p>
      </section>

      <section className="px-[clamp(1rem,4vw,3rem)] pt-[clamp(1.4rem,4vw,2rem)]">
        <div className="inline-flex rounded-full border border-rail bg-rail-soft p-1">
          <button
            type="button"
            onClick={() => setTab('cities')}
            className={`rounded-full px-[1.1rem] py-2 font-heading text-[0.84rem] font-semibold ${
              tab === 'cities' ? 'bg-ink text-white' : 'text-ink'
            }`}
          >
            Cities
          </button>
          <button
            type="button"
            onClick={() => setTab('activities')}
            className={`rounded-full px-[1.1rem] py-2 font-heading text-[0.84rem] font-semibold ${
              tab === 'activities' ? 'bg-ink text-white' : 'text-ink'
            }`}
          >
            Activities
          </button>
        </div>
      </section>

      {tab === 'cities' && (
        <section className="px-[clamp(1rem,4vw,3rem)] py-[1.6rem] pb-[clamp(3.4rem,7vw,5rem)]">
          <div className="mb-6 flex flex-wrap gap-2">
            {(['popularity', 'cost'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCitySort(s)}
                className={`rounded-full border px-[0.95rem] py-[0.42rem] font-heading text-[0.82rem] font-semibold ${
                  citySort === s ? 'border-brand bg-brand text-white' : 'border-rail bg-paper text-ink'
                }`}
              >
                {s === 'popularity' ? 'Most popular' : 'Highest cost index'}
              </button>
            ))}
          </div>

          {citiesLoading && <p className="text-muted">Loading cities…</p>}

          <div className="mx-auto grid max-w-[68rem] grid-cols-1 gap-[1.1rem] md:grid-cols-2">
            {(cityData?.items ?? []).map((dest) => (
              <article key={dest.id} className="overflow-hidden rounded-2xl border border-rail bg-paper">
                <div className="aspect-[16/10] overflow-hidden bg-wash-deep">
                  {dest.imagePath && (
                    <img src={dest.imagePath} alt={dest.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-[1.1rem_1.2rem_1.3rem]">
                  <p className="mt-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent">
                    {dest.countryName ?? 'Unknown'}
                  </p>
                  <h3 className="mb-1.5 mt-0 font-display text-[1.4rem] font-semibold text-ink">{dest.name}</h3>
                  <dl className="mt-3.5 flex gap-3">
                    <div className="rounded-lg border border-rail px-2.5 py-1.5">
                      <dt className="text-[0.68rem] uppercase tracking-wide text-muted">Cost index</dt>
                      <dd className="mt-0.5 font-heading font-bold text-ink">{dest.costIndex}</dd>
                    </div>
                    <div className="rounded-lg border border-rail px-2.5 py-1.5">
                      <dt className="text-[0.68rem] uppercase tracking-wide text-muted">Popularity</dt>
                      <dd className="mt-0.5 font-heading font-bold text-ink">{dest.popularityScore}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'activities' && (
        <section className="px-[clamp(1rem,4vw,3rem)] py-[1.6rem] pb-[clamp(3.4rem,7vw,5rem)]">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId(undefined)}
              className={`rounded-full border px-[0.95rem] py-[0.42rem] font-heading text-[0.82rem] font-semibold ${
                categoryId === undefined ? 'border-brand bg-brand text-white' : 'border-rail bg-paper text-ink'
              }`}
            >
              All
            </button>
            {(categories ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`rounded-full border px-[0.95rem] py-[0.42rem] font-heading text-[0.82rem] font-semibold ${
                  categoryId === c.id ? 'border-brand bg-brand text-white' : 'border-rail bg-paper text-ink'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search activities..."
            value={activityQuery}
            onChange={(e) => setActivityQuery(e.target.value)}
            className="mb-6 min-h-[2.6rem] w-full max-w-[24rem] rounded-lg border border-rail px-[0.9rem] text-[0.92rem]"
          />

          {activitiesLoading && <p className="text-muted">Loading activities…</p>}

          <ul className="m-0 grid max-w-[68rem] list-none gap-3 p-0">
            {(activityData?.items ?? []).map((act) => (
              <li
                key={act.id}
                className="flex items-center gap-4 rounded-2xl border border-rail bg-paper px-[1.1rem] py-[0.9rem]"
              >
                <div className="flex-1">
                  <h4 className="m-0 font-heading text-[0.98rem] font-bold text-ink">{act.name}</h4>
                  <p className="mt-0.5 text-[0.82rem] text-muted">
                    {act.cityName ?? '—'} · {act.categoryName ?? '—'}
                    {act.durationMinutes ? ` · ${act.durationMinutes} min` : ''}
                  </p>
                </div>
                <strong className="text-[0.92rem] text-ink">{formatMoney(act.baseCostCents)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default Search;
