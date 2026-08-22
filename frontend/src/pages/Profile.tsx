import { useEffect, useState } from 'react';
import { useCities } from '../api/catalog';
import { useProfile, useRemoveSavedDestination, useSavedDestinations, useUpdateProfile } from '../api/users';

function Profile() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: savedDestinations } = useSavedDestinations();
  const removeSaved = useRemoveSavedDestination();
  const { data: citiesData } = useCities();

  const [fullName, setFullName] = useState('');
  const [homeCityId, setHomeCityId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setHomeCityId(profile.homeCityId ? String(profile.homeCityId) : '');
    }
  }, [profile]);

  const cityById = new Map((citiesData?.items ?? []).map((c) => [c.id, c]));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await updateProfile.mutateAsync({
      fullName: fullName.trim(),
      homeCityId: homeCityId ? Number(homeCityId) : undefined,
    });
    setSaved(true);
  }

  if (isLoading || !profile) return <p className="p-8 text-muted">Loading profile…</p>;

  return (
    <>
      <section className="max-w-[46rem] px-[clamp(1rem,4vw,3rem)] pb-[0.6rem] pt-[clamp(2.6rem,6vw,3.6rem)]">
        <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">
          Home / Profile
        </p>
        <h1 className="my-2 font-display text-[clamp(2rem,4.6vw,3rem)] font-semibold tracking-tight text-ink">
          Your account.
        </h1>
      </section>

      <section className="mx-auto grid max-w-[64rem] grid-cols-1 gap-[1.2rem] px-[clamp(1rem,4vw,3rem)] py-[clamp(1.6rem,4vw,2.4rem)] pb-[clamp(3.4rem,7vw,5rem)] lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-[1.2rem]">
          <form onSubmit={handleSave} className="grid gap-4 rounded-2xl border border-rail bg-paper p-[1.4rem]">
            <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="min-h-[2.6rem] rounded-lg border border-rail px-[0.9rem] text-[0.92rem] font-normal"
              />
            </label>
            <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Email <span className="font-normal text-muted">(read-only)</span>
              <input
                type="email"
                value={profile.email}
                disabled
                className="min-h-[2.6rem] rounded-lg border border-rail bg-wash-soft px-[0.9rem] text-[0.92rem] font-normal text-muted"
              />
            </label>
            <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Home city
              <select
                value={homeCityId}
                onChange={(e) => setHomeCityId(e.target.value)}
                className="min-h-[2.6rem] rounded-lg border border-rail bg-white px-[0.9rem] text-[0.92rem] font-normal"
              >
                <option value="">Not set</option>
                {(citiesData?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.countryName ? `, ${c.countryName}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Preferred language{' '}
              <span className="rounded-full bg-wash-deep px-2 py-0.5 text-[0.7rem] font-normal text-muted">
                Coming soon
              </span>
              <select
                disabled
                className="min-h-[2.6rem] rounded-lg border border-rail bg-wash-soft px-[0.9rem] text-[0.92rem] font-normal text-muted"
              >
                <option>English</option>
              </select>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="min-h-[2.6rem] w-fit rounded-full bg-cta px-[1.4rem] font-heading text-[0.86rem] font-semibold text-white disabled:opacity-60"
              >
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </button>
              {saved && <span className="text-[0.82rem] text-brand">Saved.</span>}
            </div>
          </form>

          <div className="rounded-2xl border border-rail bg-paper p-[1.4rem]">
            <h3 className="m-0 mb-1.5 font-heading text-[1rem] text-ink">Danger zone</h3>
            <p className="mb-3 mt-0 text-[0.84rem] text-muted">
              Delete account has no backend route yet — flagged back rather than wired to a dead endpoint.
            </p>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-rail bg-wash-soft px-[1.1rem] py-2.5 font-heading text-[0.82rem] font-semibold text-muted"
            >
              Delete account
            </button>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-rail bg-paper p-[1.4rem]">
          <h3 className="m-0 mb-3.5 font-heading text-[1rem] text-ink">Saved destinations</h3>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {(savedDestinations ?? []).map((sd) => {
              const city = cityById.get(sd.cityId);
              return (
                <li key={sd.cityId} className="flex items-center gap-2.5 rounded-xl border border-rail p-2">
                  <div className="flex-1">
                    <h4 className="m-0 text-[0.88rem] text-ink">{city?.name ?? `City #${sd.cityId}`}</h4>
                    <p className="mt-0.5 text-[0.76rem] text-muted">{city?.countryName ?? ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSaved.mutate(sd.cityId)}
                    className="border-0 bg-transparent text-accent"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
            {(savedDestinations ?? []).length === 0 && (
              <li className="text-[0.84rem] text-muted">Nothing saved yet.</li>
            )}
          </ul>
        </div>
      </section>
    </>
  );
}

export default Profile;
