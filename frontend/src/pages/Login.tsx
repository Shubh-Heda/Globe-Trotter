import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/session';

function Login() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setStatusMessage(
      'Google sign-in needs an OAuth callback on the API. Connect this button to the server-side Google OAuth flow once that route lands.',
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage('');
    setEmailError('');
    setPasswordError('');

    const trimmedEmail = email.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    let hasError = false;
    if (!validEmail) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Enter your password.');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Field-level problems (malformed email, etc.) arrive in
        // error.details as [{field, issue}]; show them on the input itself.
        // INVALID_CREDENTIALS carries no details and stays deliberately
        // generic, so we never reveal which half was wrong.
        const details: { field?: string; issue?: string }[] = body?.error?.details ?? [];
        for (const { field, issue } of details) {
          if (!issue) continue;
          if (field === 'email') setEmailError(issue);
          else if (field === 'password') setPasswordError(issue);
        }
        throw new Error(body?.error?.message || "We couldn't sign you in. Check your details and try again.");
      }

      if (body.token && body.user) {
        setSession(body.token, body.user);
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (error: any) {
      setStatusMessage(error.message || "We couldn't sign you in. Check your details and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-wash text-ink lg:grid-cols-[1.1fr_1fr]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-brand-gradient p-8 lg:p-12">
        <Link to="/" className="relative z-10 inline-flex items-center gap-2.5">
          <span className="grid h-[2.15rem] w-[2.15rem] place-items-center rounded-full bg-white/15 text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.2 15.6 2.1-5.3 5.3-2.1-2.1 5.3z" />
            </svg>
          </span>
          <span className="font-display text-[1.32rem] font-semibold text-white">TripCraft</span>
        </Link>

        <div className="relative z-10 max-w-[26rem] py-12 lg:py-0">
          <p className="mb-3 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-[#cfe6dc]">
            Boarding pass
          </p>
          <h1 className="mb-4 font-display text-[2.2rem] font-semibold leading-[1.15] text-white">
            Every trip you're planning, in one place.
          </h1>
          <p className="m-0 leading-[1.7] text-[#dfeae4]">
            Routes, costs and bookings — laid out like an itinerary you'd actually trust.
          </p>
        </div>

        <p className="relative z-10 m-0 text-[0.8rem] text-[#8fa79e]">
          Multi-city trip planning, without six scattered tabs.
        </p>
      </div>

      <section className="flex items-center justify-center p-8" aria-labelledby="login-title">
        <div className="w-full max-w-[23rem]">
          <div className="mb-6 flex rounded-full border border-rail bg-rail-soft p-1">
            <span className="flex-1 rounded-full bg-brand py-2.5 text-center font-heading text-[0.85rem] font-semibold text-white">
              Log in
            </span>
            <Link
              to="/signup"
              className="flex-1 rounded-full py-2.5 text-center font-heading text-[0.85rem] font-semibold text-ink no-underline"
            >
              Sign up
            </Link>
          </div>

          <h2 id="login-title" className="sr-only">
            Welcome back
          </h2>

          <form id="login-form" onSubmit={handleSubmit} noValidate className="grid gap-4">
            <label htmlFor="email" className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Email
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby="email-error"
                aria-invalid={!!emailError}
                className="min-h-[2.6rem] rounded-lg border border-rail px-[0.9rem] text-[0.92rem] font-normal outline-none focus:border-brand-light"
              />
              {emailError && (
                <span className="text-[0.78rem] text-stamp" id="email-error">
                  {emailError}
                </span>
              )}
            </label>

            <label htmlFor="password" className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Password
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-error"
                  aria-invalid={!!passwordError}
                  className="min-h-[2.6rem] w-full rounded-lg border border-rail px-[0.9rem] pr-14 text-[0.92rem] font-normal outline-none focus:border-brand-light"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-controls="password"
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent text-[0.8rem] font-semibold text-brand"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {passwordError && (
                <span className="text-[0.78rem] text-stamp" id="password-error">
                  {passwordError}
                </span>
              )}
            </label>

            <p className="m-0 text-[0.82rem] text-muted">
              Forgot password isn't wired up yet — that flow needs a backend route first.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="min-h-[2.7rem] rounded-full bg-cta font-heading text-[0.9rem] font-semibold text-white shadow-[0_10px_22px_rgba(178,114,28,0.28)] disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Log in'}
            </button>

            <p className="my-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[0.72rem] uppercase tracking-widest text-muted">
              <span className="h-px bg-rail" />
              or continue with
              <span className="h-px bg-rail" />
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex min-h-[2.7rem] items-center justify-center gap-2.5 rounded-full border border-rail bg-paper font-heading text-[0.86rem] font-semibold text-ink"
            >
              <span className="grid h-[1.1rem] w-[1.1rem] place-items-center text-[1.1rem] font-extrabold text-[#4285f4]" aria-hidden="true">
                G
              </span>
              Continue with Google
            </button>

            {statusMessage && (
              <p className="m-0 rounded-lg bg-[#f9e9e6] p-3 text-[0.86rem] leading-relaxed text-stamp" role="alert">
                {statusMessage}
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-[0.86rem] text-muted">
            New to TripCraft?{' '}
            <Link className="font-semibold text-brand" to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
