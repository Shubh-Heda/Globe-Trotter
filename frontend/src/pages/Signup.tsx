import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/session';

function Signup() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  // States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Field errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Status alert
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validation & Submit Handler
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
    // Mirror the API's password rules (app/modules/auth/schemas.py) so the
    // user is told what's wrong here, instead of getting a 400 after submit.
    if (password.length < 8) {
      setPasswordError('Use at least 8 characters.');
      hasError = true;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError('Include at least one uppercase letter.');
      hasError = true;
    } else if (!/\d/.test(password)) {
      setPasswordError('Include at least one number.');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          password
        }),
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
        throw new Error("Invalid response from server.");
      }
    } catch (error: any) {
      setStatusMessage(error.message || "We couldn't create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setStatusMessage('Google sign-in needs an OAuth callback on the API. Connect this button to the approved server-side Google OAuth flow before release.');
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] bg-wash text-ink">
      
      {/* Left Intro Banner */}
      <section className="relative overflow-hidden p-8 lg:p-24 text-paper bg-[#133b46] flex flex-col justify-between min-h-[320px] lg:min-h-screen" aria-labelledby="site-title">
        {/* Circle Overlays */}
        <div className="absolute w-[720px] h-[720px] border border-white/5 rounded-full right-[-295px] bottom-[-430px] pointer-events-none" />
        <div className="absolute w-[460px] h-[460px] border border-white/5 rounded-full left-[-250px] top-[-165px] pointer-events-none" />
        
        <Link className="relative z-10 flex items-center gap-3 text-inherit font-extrabold tracking-tight text-lg no-underline" to="/">
          <span className="w-8 h-8 border-[1.5px] border-current rounded-full grid place-items-center font-bold text-[1.1rem]">GT</span>
          GlobeTrotter
        </Link>
        
        <div className="relative z-10 my-8 lg:my-0">
          <p className="m-0 mb-4 text-[#b8d4d8] text-xs font-extrabold uppercase tracking-[0.15em]">Multi-city trip planner</p>
          <h1 id="site-title" className="max-w-[580px] m-0 font-serif text-4xl lg:text-7xl font-normal leading-[0.98] tracking-tighter">
            Start with the places that matter.
          </h1>
          <p className="max-w-[450px] mt-6 mb-0 text-[#d3e0df] text-base lg:text-lg leading-relaxed">
            Create an account to organise cities, activities and budgets into one clear travel plan.
          </p>
        </div>
        
        <div className="relative z-10 hidden lg:flex items-center gap-3 text-[#bfd7d7] text-xs">
          <span className="block w-14 h-[1px] bg-ochre" /> Plan / organise / share
        </div>
      </section>

      {/* Right Auth Form */}
      <section className="min-h-full grid place-items-center p-8 bg-paper" aria-labelledby="signup-title">
        <div className="w-full max-w-[400px]">
          <header className="mb-6">
            <h2 id="signup-title" className="m-0 mb-2 font-serif text-3xl lg:text-4xl font-normal tracking-tight">Create your account</h2>
            <p className="m-0 text-muted leading-relaxed text-sm">Save your plans and return to them whenever you need.</p>
          </header>
          
          <form id="signup-form" onSubmit={handleSubmit} noValidate>
            
            {/* Full Name Field */}
            <div className="grid gap-2 mb-3">
              <label htmlFor="fullName" className="text-sm font-bold">Full name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-describedby="fullName-error"
                aria-invalid={!!nameError}
                className="w-full min-h-[3.15rem] px-4 py-3 border border-[#b8c1bb] rounded-md text-ink bg-white outline-none focus:border-transit focus:ring-2 focus:ring-transit/10 transition"
              />
              <span className="min-h-[1.05rem] text-stamp text-xs" id="fullName-error">{nameError}</span>
            </div>

            {/* Email Field */}
            <div className="grid gap-2 mb-3">
              <label htmlFor="email" className="text-sm font-bold">Email address</label>
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
                className="w-full min-h-[3.15rem] px-4 py-3 border border-[#b8c1bb] rounded-md text-ink bg-white outline-none focus:border-transit focus:ring-2 focus:ring-transit/10 transition"
              />
              <span className="min-h-[1.05rem] text-stamp text-xs" id="email-error">{emailError}</span>
            </div>

            {/* Password Field */}
            <div className="grid gap-2 mb-6">
              <label htmlFor="password" className="text-sm font-bold">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-error"
                  aria-invalid={!!passwordError}
                  className="w-full min-h-[3.15rem] pl-4 pr-16 py-3 border border-[#b8c1bb] rounded-md text-ink bg-white outline-none focus:border-transit focus:ring-2 focus:ring-transit/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-controls="password"
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 border-0 text-[#09536b] bg-transparent cursor-pointer text-[0.83rem] font-bold"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className="min-h-[1.05rem] text-stamp text-xs" id="password-error">{passwordError}</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[3.15rem] border border-transparent rounded-md font-bold text-white bg-transit hover:bg-transit-dark transition active:translate-y-[1px] disabled:opacity-75 disabled:pointer-events-none"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>

            {/* Divider */}
            <p className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center my-6 text-[#77817c] text-xs uppercase tracking-widest">
              <span className="h-[1px] bg-[#d8ded9]" />
              or continue with
              <span className="h-[1px] bg-[#d8ded9]" />
            </p>

            {/* Google Signup */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              className="w-full min-h-[3.15rem] border border-[#c9d0ca] rounded-md font-bold text-ink bg-white hover:bg-[#f6f8f5] transition flex items-center justify-center gap-3"
            >
              <span className="w-[1.1rem] h-[1.1rem] grid place-items-center text-[1.18rem] font-extrabold text-[#4285f4]" aria-hidden="true">G</span>
              Continue with Google
            </button>

            {/* Status Messages */}
            {statusMessage && (
              <p className="mt-4 p-3 rounded bg-[#f9e9e6] text-[#8c2b21] text-[0.86rem] leading-relaxed" role="alert">
                {statusMessage}
              </p>
            )}

          </form>
          
          <p className="mt-6 text-muted text-center text-sm">
            Already have an account?{' '}
            <Link className="text-[#09536b] font-bold underline underline-offset-4" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </section>

    </main>
  );
}

export default Signup;
