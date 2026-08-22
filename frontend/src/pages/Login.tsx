import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/session';

function Login() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

  // Submit Handler
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage('');
    setEmailError('');
    setPasswordError('');

    // Validation
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
        navigate('/');
      } else {
        throw new Error("Invalid response from server.");
      }
    } catch (error: any) {
      setStatusMessage(error.message || "We couldn't sign you in. Check your details and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
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
            Travel plans, in one place.
          </h1>
          <p className="max-w-[450px] mt-6 mb-0 text-[#d3e0df] text-base lg:text-lg leading-relaxed">
            Build multi-city itineraries, keep activities organised by day, and see the budget before you leave.
          </p>
        </div>
        
        <div className="relative z-10 hidden lg:flex items-center gap-3 text-[#bfd7d7] text-xs">
          <span className="block w-14 h-[1px] bg-ochre" /> Plan / organise / share
        </div>
      </section>

      {/* Right Auth Form */}
      <section className="min-h-full grid place-items-center p-8 bg-paper" aria-labelledby="login-title">
        <div className="w-full max-w-[400px]">
          <header className="mb-8">
            <h2 id="login-title" className="m-0 mb-2 font-serif text-3xl lg:text-4xl font-normal tracking-tight">Welcome back</h2>
            <p className="m-0 text-muted leading-relaxed text-sm">Sign in to pick up where your plans left off.</p>
          </header>
          
          <form id="login-form" onSubmit={handleSubmit} noValidate>
            
            {/* Email Field */}
            <div className="grid gap-2 mb-4">
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
            <div className="grid gap-2 mb-2">
              <label htmlFor="password" className="text-sm font-bold">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
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

            {/* Forgot Password Link */}
            <div className="flex justify-between items-center mb-6">
              <span />
              <button
                type="button"
                onClick={() => setIsRecoveryOpen(true)}
                className="p-0 border-0 text-[#09536b] bg-transparent cursor-pointer text-sm font-bold underline underline-offset-4"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[3.15rem] border border-transparent rounded-md font-bold text-white bg-transit hover:bg-transit-dark transition active:translate-y-[1px] disabled:opacity-75 disabled:pointer-events-none"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            {/* Divider */}
            <p className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center my-6 text-[#77817c] text-xs uppercase tracking-widest">
              <span className="h-[1px] bg-[#d8ded9]" />
              or continue with
              <span className="h-[1px] bg-[#d8ded9]" />
            </p>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
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
            New to GlobeTrotter?{' '}
            <Link className="text-[#09536b] font-bold underline underline-offset-4" to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </section>

      {/* Password Recovery Modal */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
          <div className="w-full max-w-[420px] bg-paper rounded-lg shadow-2xl p-6">
            <h3 id="recovery-title" className="m-0 mb-3 font-serif text-2xl font-normal">Password recovery</h3>
            <p className="m-0 text-muted leading-relaxed text-sm mb-6">
              Account recovery is not yet connected to an email service. Once you can sign in, passwords can be changed from account settings.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsRecoveryOpen(false)}
                className="min-h-[2.5rem] px-5 border border-transparent rounded-md font-bold text-white bg-transit hover:bg-transit-dark transition active:translate-y-[1px]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

export default Login;
