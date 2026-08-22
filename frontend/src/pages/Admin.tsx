import { useAdminStats, useAdminUsers, useUpdateAdminUser } from '../api/users';
import { ApiError } from '../api/client';

function Admin() {
  const { data: stats, isLoading, isError, error } = useAdminStats();
  const { data: usersData } = useAdminUsers();
  const updateUser = useUpdateAdminUser();

  if (isLoading) return <p className="p-8 text-muted">Loading analytics…</p>;
  if (isError || !stats) {
    const message =
      error instanceof ApiError && error.status === 401
        ? "You're not an admin on this account — this page needs role: ADMIN."
        : "Couldn't load admin analytics.";
    return <p className="p-8 text-stamp">{message}</p>;
  }

  const maxTrend = Math.max(1, ...stats.tripsCreated30D.map((p) => p.count));
  const maxCity = Math.max(1, ...stats.topCities.map((c) => c.count));
  const maxActivity = Math.max(1, ...stats.topActivities.map((a) => a.count));

  return (
    <>
      <section className="max-w-[52rem] px-[clamp(1rem,4vw,3rem)] pb-[0.6rem] pt-[clamp(2.6rem,6vw,3.6rem)]">
        <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-accent">
          Admin only
        </p>
        <h1 className="my-2 font-display text-[clamp(2rem,4.6vw,2.8rem)] font-semibold tracking-tight text-ink">
          Platform analytics.
        </h1>
      </section>

      <section className="mx-auto max-w-[76rem] px-[clamp(1rem,4vw,3rem)] py-[clamp(1.6rem,4vw,2.4rem)] pb-[clamp(3.4rem,7vw,5rem)]">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ['Total users', stats.totalUsers],
            ['Total trips', stats.totalTrips],
            ['Total stops', stats.totalStops],
            ['Total activities', stats.totalActivities],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-rail bg-paper p-[1.1rem]">
              <p className="m-0 text-[0.76rem] uppercase tracking-[0.06em] text-muted">{label}</p>
              <strong className="font-display text-[1.7rem] text-ink">{value}</strong>
            </div>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-rail bg-paper p-[1.2rem]">
            <h3 className="m-0 mb-3.5 font-heading text-[0.98rem] text-ink">Trips created — last 30 days</h3>
            <div className="flex h-[6.5rem] items-end gap-[2px]">
              {stats.tripsCreated30D.map((bar) => (
                <div
                  key={bar.date}
                  title={bar.date}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${Math.round((bar.count / maxTrend) * 100)}%`,
                    background: 'linear-gradient(180deg,#1f6f5c,#13463a)',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-rail bg-paper p-[1.2rem]">
            <h3 className="m-0 mb-2.5 font-heading text-[0.98rem] text-ink">Engagement</h3>
            <p className="m-0 text-[0.82rem] text-muted">Active users</p>
            <strong className="font-display text-[1.5rem] text-ink">{stats.engagement.activeUsers}</strong>
            <p className="mt-3 text-[0.82rem] text-muted">Trips per active user</p>
            <strong className="font-display text-[1.5rem] text-ink">
              {stats.engagement.tripsPerActiveUser.toFixed(1)}
            </strong>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-rail bg-paper p-[1.2rem]">
            <h3 className="m-0 mb-3.5 font-heading text-[0.98rem] text-ink">Top cities</h3>
            <div className="grid gap-2.5">
              {stats.topCities.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-[0.82rem] text-ink">
                    <span>{c.name}</span>
                    <span className="font-bold">{c.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-wash-deep">
                    <div
                      className="h-full rounded-full bg-brand-light"
                      style={{ width: `${Math.round((c.count / maxCity) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-rail bg-paper p-[1.2rem]">
            <h3 className="m-0 mb-3.5 font-heading text-[0.98rem] text-ink">Top activities</h3>
            <div className="grid gap-2.5">
              {stats.topActivities.map((a) => (
                <div key={a.name}>
                  <div className="mb-1 flex justify-between text-[0.82rem] text-ink">
                    <span>{a.name}</span>
                    <span className="font-bold">{a.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-wash-deep">
                    <div
                      className="h-full rounded-full bg-accent-light"
                      style={{ width: `${Math.round((a.count / maxActivity) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-auto rounded-2xl border border-rail bg-paper p-[1.2rem]">
          <h3 className="m-0 mb-3.5 font-heading text-[0.98rem] text-ink">Users</h3>
          <table className="w-full border-collapse text-[0.86rem]">
            <thead>
              <tr className="text-left font-heading text-[0.74rem] uppercase tracking-[0.05em] text-muted">
                <th className="border-b border-rail px-2.5 py-2">Name</th>
                <th className="border-b border-rail px-2.5 py-2">Email</th>
                <th className="border-b border-rail px-2.5 py-2">Role</th>
                <th className="border-b border-rail px-2.5 py-2">Status</th>
                <th className="border-b border-rail px-2.5 py-2" />
              </tr>
            </thead>
            <tbody>
              {(usersData?.items ?? []).map((u) => {
                const isAdmin = u.role === 'ADMIN';
                const isDeleted = !!u.deletedAt;
                return (
                  <tr key={u.id}>
                    <td className="border-b border-rail-soft px-2.5 py-2.5 text-ink">{u.fullName}</td>
                    <td className="border-b border-rail-soft px-2.5 py-2.5 text-muted">{u.email}</td>
                    <td className="border-b border-rail-soft px-2.5 py-2.5">
                      <span className={`font-bold ${isAdmin ? 'text-accent' : 'text-ink'}`}>{u.role}</span>
                    </td>
                    <td className="border-b border-rail-soft px-2.5 py-2.5">
                      <span className={isDeleted ? 'font-semibold text-stamp' : 'font-semibold text-brand'}>
                        {isDeleted ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border-b border-rail-soft px-2.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          updateUser.mutate({ userId: u.id, role: isAdmin ? 'USER' : 'ADMIN' })
                        }
                        className="mr-1.5 rounded-full border border-rail bg-paper px-2.5 py-1 text-[0.74rem] font-semibold text-ink"
                      >
                        {isAdmin ? 'Make user' : 'Make admin'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateUser.mutate({
                            userId: u.id,
                            deletedAt: isDeleted ? null : new Date().toISOString(),
                          })
                        }
                        className="rounded-full border border-rail bg-paper px-2.5 py-1 text-[0.74rem] font-semibold text-ink"
                      >
                        {isDeleted ? 'Reactivate' : 'Deactivate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default Admin;
