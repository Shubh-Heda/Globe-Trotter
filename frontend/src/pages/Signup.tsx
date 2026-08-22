import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/session';

function PasswordCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={met ? 'text-brand' : 'text-muted'}>
      {met ? '✓' : '○'} {label}
    </li>
  );
}

function Signup() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const has8Chars = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage('');
    setNameError('');
    setEmailError('');
    setPasswordError('');

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    const validName = trimmedName.length >= 2;
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    let hasError = false;
    if (!validName) {
      setNameError('Enter your full name.');
      hasError = true;
    }
    if (!validEmail) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    }
    // Mirrors the API's password rules (app/modules/auth/schemas.py) so the
    // user is told what's wrong here, instead of getting a 400 after submit.
    if (!has8Chars) {
      setPasswordError('Use at least 8 characters.');
      hasError = true;
    } else if (!hasUpper) {
      setPasswordError('Include at least one uppercase letter.');
      hasError = true;
    } else if (!hasDigit) {
      setPasswordError('Include at least one number.');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: trimmedName, email: trimmedEmail, password }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        // The API returns per-field problems in error.details as
        // [{field, issue}] — show each against its own input.
        const details: { field?: string; issue?: string }[] = body?.error?.details ?? [];
        for (const { field, issue } of details) {
          if (!issue) continue;
          if (field === 'fullName' || field === 'full_name') setNameError(issue);
          else if (field === 'email') setEmailError(issue);
          else if (field === 'password') setPasswordError(issue);
        }
        throw new Error(body?.error?.message || "We couldn't create your account. Please try again.");
      }

      if (body.token && body.user) {
        setSession(body.token, body.user);
        navigate('/');
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (error: any) {
      setStatusMessage(error.message || "We couldn't create your account. Please try again.");
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
          <span className="font-display text-[1.32rem] font-semibold text-white">GlobeTrotter</span>
        </Link>

        <div className="relative z-10 max-w-[26rem] py-12 lg:py-0">
          <p className="mb-3 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-[#cfe6dc]">
            Boarding pass
          </p>
          <h1 className="mb-4 font-display text-[2.2rem] font-semibold leading-[1.15] text-white">
            Start with the places that matter.
          </h1>
          <p className="m-0 leading-[1.7] text-[#dfeae4]">
            Create an account to organise cities, activities and budgets into one clear travel plan.
          </p>
        </div>

        <p className="relative z-10 m-0 text-[0.8rem] text-[#8fa79e]">
          Multi-city trip planning, without six scattered tabs.
        </p>
      </div>

      <section className="flex items-center justify-center p-8" aria-labelledby="signup-title">
        <div className="w-full max-w-[23rem]">
          <div className="mb-6 flex rounded-full border border-rail bg-rail-soft p-1">
            <Link
              to="/login"
              className="flex-1 rounded-full py-2.5 text-center font-heading text-[0.85rem] font-semibold text-ink no-underline"
            >
              Log in
            </Link>
            <span className="flex-1 rounded-full bg-brand py-2.5 text-center font-heading text-[0.85rem] font-semibold text-white">
              Sign up
            </span>
          </div>

          <h2 id="signup-title" className="sr-only">
            Create your account
          </h2>

          <form id="signup-form" onSubmit={handleSubmit} noValidate className="grid gap-4">
            <label htmlFor="fullName" className="grid gap-1.5 font-heading text-[0.82rem] font-semibold text-ink">
              Full name
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Asha Rao"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-describedby="fullName-error"
                aria-invalid={!!nameError}
                className="min-h-[2.6rem] rounded-lg border border-rail px-[0.9rem] text-[0.92rem] font-normal outline-none focus:border-brand-light"
              />
              {nameError && (
                <span className="text-[0.78rem] text-stamp" id="fullName-error">
                  {nameError}
                </span>
              )}
            </label>

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
                  autoComplete="new-password"
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

            <ul className="-mt-2 grid list-none gap-1 p-0 text-[0.8rem]">
              <PasswordCheck met={has8Chars} label="At least 8 characters" />
              <PasswordCheck met={hasUpper} label="One uppercase letter" />
              <PasswordCheck met={hasDigit} label="One digit" />
            </ul>

            <button
              type="submit"
              disabled={isLoading}
              className="min-h-[2.7rem] rounded-full bg-cta font-heading text-[0.9rem] font-semibold text-white shadow-[0_10px_22px_rgba(178,114,28,0.28)] disabled:opacity-60"
            >
              {isLoading ? 'Creating account…' : 'Sign up'}
            </button>

            {statusMessage && (
              <p className="m-0 rounded-lg bg-[#f9e9e6] p-3 text-[0.86rem] leading-relaxed text-stamp" role="alert">
                {statusMessage}
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-[0.86rem] text-muted">
            Already have an account?{' '}
            <Link className="font-semibold text-brand" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Signup;
