import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSessionStore } from '../stores/session';

interface Trip {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  coverStyle: string;
  budgetCapCents: number | null;
  estimatedCostCents: number;
}

function Dashboard() {
  const { token, user, clearSession } = useSessionStore();

  // Trips & Filters State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [profileName, setProfileName] = useState('Traveler');

  // Dialog Form States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [budgetCap, setBudgetCap] = useState('');
  const [selectedCover, setSelectedCover] = useState('style1');
  const [isSaving, setIsSaving] = useState(false);

  // Form Field Errors
  const [nameError, setNameError] = useState('');
  const [startError, setStartError] = useState('');
  const [endError, setEndError] = useState('');
  const [budgetError, setBudgetError] = useState('');

  // Initial Seed Data
  const getInitialTrips = () => {
    const today = new Date();
    const formatOffsetDate = (days: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    return [
      {
        id: "1",
        name: "Kerala Backwaters Escape",
        description: "Exploring the serene backwaters, houseboats, and spice gardens of God's Own Country.",
        startDate: formatOffsetDate(5),
        endDate: formatOffsetDate(10),
        coverStyle: "style1",
        budgetCapCents: 120000,
        estimatedCostCents: 85000
      },
      {
        id: "2",
        name: "Kyoto Autumn Explorer",
        description: "Traditional tea houses, temples, autumn leaves, and food trails in Kyoto.",
        startDate: formatOffsetDate(45),
        endDate: formatOffsetDate(52),
        coverStyle: "style2",
        budgetCapCents: 250000,
        estimatedCostCents: 180000
      },
      {
        id: "3",
        name: "Weekend in Barcelona",
        description: "Gothic architecture, Gaudi designs, tapas, and the beach.",
        startDate: formatOffsetDate(-20),
        endDate: formatOffsetDate(-17),
        coverStyle: "style3",
        budgetCapCents: 80000,
        estimatedCostCents: 82000
      }
    ];
  };

  // Fetch Profile & Setup Trips
  useEffect(() => {
    // Load local trips
    if (!localStorage.getItem('globetrotter_mock_trips')) {
      localStorage.setItem('globetrotter_mock_trips', JSON.stringify(getInitialTrips()));
    }
    const localTrips = JSON.parse(localStorage.getItem('globetrotter_mock_trips') || '[]');
    setTrips(localTrips);

    // Fetch live user info
    const fetchMe = async () => {
      try {
        const response = await fetch('/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          if (response.status === 401) {
            clearSession();
          }
          return;
        }
        const data = await response.json();
        if (data.fullName) {
          setProfileName(data.fullName);
        }
      } catch (err) {
        // Fallback for offline mode
        if (user && user.fullName) {
          setProfileName(user.fullName);
        }
      }
    };

    if (token) fetchMe();
  }, [token]);

  // Date and status helpers
  const parseDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');
  
  const getTripStatus = (startDateStr: string, endDateStr: string): 'UPCOMING' | 'ONGOING' | 'COMPLETED' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseDate(startDateStr);
    const end = parseDate(endDateStr);
    
    if (start > today) return 'UPCOMING';
    if (end < today) return 'COMPLETED';
    return 'ONGOING';
  };

  const formatDateNice = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return parseDate(dateStr).toLocaleDateString('en-US', options);
  };

  const formatCurrency = (cents: number | null) => {
    if (!cents) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const getCoverBg = (coverStyle: string) => {
    const mapping: Record<string, string> = {
      style1: 'linear-gradient(135deg, #133b46, #0e6e8c)',
      style2: 'linear-gradient(135deg, #a06a14, #d79b2f)',
      style3: 'linear-gradient(135deg, #b33a2b, #e06d5e)',
      style4: 'linear-gradient(135deg, #2c6e3d, #62b376)'
    };
    return mapping[coverStyle] || mapping['style1'];
  };

  // Find next upcoming trip countdown
  const getCountdown = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = trips
      .filter(t => getTripStatus(t.startDate, t.endDate) === 'UPCOMING')
      .sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());

    if (upcoming.length > 0) {
      const nextTrip = upcoming[0];
      const daysDiff = Math.ceil((parseDate(nextTrip.startDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { name: nextTrip.name, days: daysDiff };
    }
    return null;
  };

  const countdown = getCountdown();

  // Budget summaries for active trips
  const activeTrips = trips.filter(t => getTripStatus(t.startDate, t.endDate) !== 'COMPLETED');
  let totalCap = 0;
  let totalCost = 0;
  activeTrips.forEach(t => {
    totalCap += t.budgetCapCents || 0;
    totalCost += t.estimatedCostCents || 0;
  });
  const budgetProgressPct = totalCap > 0 ? Math.min(100, Math.round((totalCost / totalCap) * 100)) : 0;
  const isOverBudget = totalCap > 0 && totalCost > totalCap;

  // Filter & Sort trips
  const filteredTrips = trips.filter(t => {
    if (currentFilter === 'all') return true;
    return getTripStatus(t.startDate, t.endDate).toLowerCase() === currentFilter;
  });

  filteredTrips.sort((a, b) => {
    const statusA = getTripStatus(a.startDate, a.endDate);
    const statusB = getTripStatus(b.startDate, b.endDate);
    
    if (statusA === 'ONGOING' && statusB !== 'ONGOING') return -1;
    if (statusB === 'ONGOING' && statusA !== 'ONGOING') return 1;
    
    if (statusA === 'UPCOMING' && statusB === 'UPCOMING') {
      return parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime();
    }
    if (statusA === 'COMPLETED' && statusB === 'COMPLETED') {
      return parseDate(b.endDate).getTime() - parseDate(a.endDate).getTime();
    }
    return statusA === 'UPCOMING' ? -1 : 1;
  });

  // Handle Form Submission
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setStartError('');
    setEndError('');
    setBudgetError('');

    let isValid = true;
    if (!tripName.trim()) {
      setNameError('Trip name is required.');
      isValid = false;
    }
    if (!startDate) {
      setStartError('Start date is required.');
      isValid = false;
    }
    if (!endDate) {
      setEndError('End date is required.');
      isValid = false;
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setEndError('End date must be on or after the start date.');
      isValid = false;
    }
    if (budgetCap && parseFloat(budgetCap) < 0) {
      setBudgetError('Budget cap must be a positive number.');
      isValid = false;
    }

    if (!isValid) return;

    setIsSaving(true);

    const payload = {
      name: tripName.trim(),
      description: description.trim() || null,
      startDate: startDate,
      endDate: endDate,
      coverStyle: selectedCover,
      budgetCapCents: budgetCap ? Math.round(parseFloat(budgetCap) * 100) : null,
      estimatedCostCents: 0
    };

    try {
      // Attempt POST to backend
      const response = await fetch('/api/v1/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || "API error");
      
      const updatedTrips = [...trips, data];
      setTrips(updatedTrips);
      localStorage.setItem('globetrotter_mock_trips', JSON.stringify(updatedTrips));
    } catch (err) {
      // Offline fallback: save locally
      const fallbackTrip: Trip = {
        id: String(Date.now()),
        ...payload,
        estimatedCostCents: 0
      };
      const updatedTrips = [...trips, fallbackTrip];
      setTrips(updatedTrips);
      localStorage.setItem('globetrotter_mock_trips', JSON.stringify(updatedTrips));
    } finally {
      setIsSaving(false);
      setIsDialogOpen(false);
      // Reset form
      setTripName('');
      setStartDate('');
      setEndDate('');
      setDescription('');
      setBudgetCap('');
      setSelectedCover('style1');
    }
  };

  return (
    <div className="bg-wash min-h-screen text-ink">
      
      {/* Navigation Header */}
      <header className="bg-paper border-b border-rail sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-ink font-extrabold tracking-tight text-[1.25rem] no-underline">
            <span className="w-[2.2rem] h-[2.2rem] border-[1.5px] border-current rounded-full grid place-items-center font-extrabold text-[1.2rem]">GT</span>
            GlobeTrotter
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">{profileName}</span>
            <button
              onClick={() => clearSession()}
              type="button"
              className="border border-[#c9d0ca] px-3.5 py-1.5 rounded bg-white cursor-pointer font-bold text-xs hover:bg-[#f6f8f5] hover:border-[#b8c1bb] transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Grid Container */}
      <main className="max-w-[1200px] mx-auto my-8 px-6 grid grid-cols-1 lg:grid-cols-[2.1fr_0.9fr] gap-8">
        
        {/* Left Section - Trips */}
        <section>
          {/* Welcome Banner */}
          <div className="relative overflow-hidden p-8 bg-[#133b46] rounded-xl text-paper mb-8 before:absolute before:w-[320px] before:h-[320px] before:border before:border-white/10 before:rounded-full before:right-[-80px] before:top-[-80px] before:pointer-events-none">
            <h1 className="m-0 mb-2 font-serif text-3xl font-medium tracking-tight">
              Hello, {profileName.split(' ')[0]}!
            </h1>
            <p className="m-0 text-[#bfd7d7]">Your travel plans organized, tracked, and ready to share.</p>
            
            {/* Dynamic Countdown */}
            {countdown && (
              <div className="flex items-center justify-between gap-6 border border-white/15 bg-white/10 rounded-lg p-4 mt-6">
                <div className="flex flex-col">
                  <span className="text-[0.78rem] font-extrabold uppercase tracking-widest text-[#92b8be] mb-1">Next Adventure</span>
                  <span className="text-[1.15rem] font-bold">{countdown.name}</span>
                </div>
                <div className="bg-ochre text-ink font-extrabold px-3 py-2 rounded text-base font-mono tracking-wider">
                  {countdown.days} {countdown.days === 1 ? 'day' : 'days'}
                </div>
              </div>
            )}
          </div>

          {/* Section Header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-serif text-2xl font-medium m-0">My Trips</h2>
            <button
              onClick={() => setIsDialogOpen(true)}
              type="button"
              className="bg-transit hover:bg-transit-dark text-white font-bold px-5 py-2.5 rounded-lg border-0 cursor-pointer active:translate-y-[1px] transition"
            >
              + Plan New Trip
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-rail mb-6">
            {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setCurrentFilter(filter)}
                type="button"
                className={`bg-transparent border-0 px-4 py-2.5 font-bold text-sm cursor-pointer border-b-2 capitalize transition ${
                  currentFilter === filter ? 'text-transit border-transit' : 'text-muted border-transparent hover:text-ink'
                }`}
              >
                {filter} Trips
              </button>
            ))}
          </div>

          {/* Trips Grid */}
          <div className="grid grid-cols-1 gap-5">
            {filteredTrips.length === 0 ? (
              <div className="bg-paper border border-dashed border-rail rounded-xl p-14 text-center">
                <div className="text-5xl mb-4 text-muted" aria-hidden="true">🗺️</div>
                <h3 className="font-serif text-xl font-medium m-0 mb-2">No trips found</h3>
                <p className="text-muted m-0 mb-6 text-[0.92rem] max-w-[400px] mx-auto leading-relaxed">
                  Your list is looking empty in this filter. Time to start mapping out your next adventure!
                </p>
                <button
                  onClick={() => setIsDialogOpen(true)}
                  type="button"
                  className="bg-transit hover:bg-transit-dark text-white font-bold px-5 py-2.5 rounded-lg border-0 cursor-pointer active:translate-y-[1px] transition"
                >
                  + Plan New Trip
                </button>
              </div>
            ) : (
              filteredTrips.map((t) => {
                const status = getTripStatus(t.startDate, t.endDate);
                const isTripOverbudget = t.budgetCapCents ? t.estimatedCostCents > t.budgetCapCents : false;
                
                return (
                  <div key={t.id} className="bg-paper border border-rail rounded-xl flex overflow-hidden h-[10.5rem] hover:shadow-lg hover:border-[#b8c1bb] transition duration-200">
                    <div
                      className="w-[10.5rem] flex-shrink-0 flex items-center justify-center text-5xl text-white/70"
                      style={{ background: getCoverBg(t.coverStyle) }}
                    >
                      ✈️
                    </div>
                    <div className="p-5 flex-grow flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[0.8rem] text-muted font-bold">
                            {formatDateNice(t.startDate)} – {formatDateNice(t.endDate)}
                          </span>
                          <span className={`text-[0.7rem] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                            status === 'UPCOMING' ? 'bg-[#e3eff2] text-[#085168]' :
                            status === 'ONGOING' ? 'bg-[#fdf5e6] text-[#a06a14]' :
                            'bg-[#edf2ee] text-[#2c6e3d]'
                          }`}>
                            {status}
                          </span>
                        </div>
                        <h3 className="m-0 mb-1 font-serif text-[1.3rem] font-medium leading-tight truncate">
                          <a href={`/trips/${t.id}`} className="text-ink hover:text-transit hover:underline no-underline">
                            {t.name}
                          </a>
                        </h3>
                        <p className="m-0 text-muted text-[0.88rem] leading-normal line-clamp-2">
                          {t.description || 'No description provided.'}
                        </p>
                      </div>
                      <div className="flex justify-between items-center border-t border-wash pt-3 mt-2">
                        <span className="text-[0.82rem] font-semibold" style={{ color: isTripOverbudget ? 'var(--stamp)' : 'inherit' }}>
                          Est: {formatCurrency(t.estimatedCostCents)}
                          {t.budgetCapCents ? ` / Cap: ${formatCurrency(t.budgetCapCents)}` : ''}
                        </span>
                        <a href={`/trips/${t.id}`} className="text-transit font-extrabold text-[0.85rem] hover:underline no-underline">
                          Manage trip &rarr;
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Section - Sidebar */}
        <aside className="flex flex-col gap-6">
          
          {/* Budget highlights widget */}
          <section className="bg-paper border border-rail rounded-xl p-5">
            <h3 className="font-serif text-lg font-medium m-0 mb-4 border-b border-wash pb-2">Budget Overview</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm">
                <span>Active Trips Cap</span>
                <span className="font-bold font-mono text-[0.95rem]">{formatCurrency(totalCap)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Estimated Costs</span>
                <span className="font-bold font-mono text-[0.95rem]">{formatCurrency(totalCost)}</span>
              </div>
              <div>
                <div className="h-[0.45rem] bg-wash rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? 'bg-stamp' : 'bg-transit'}`}
                    style={{ width: `${budgetProgressPct}%` }}
                  />
                </div>
                {isOverBudget && (
                  <div className="text-stamp text-xs font-bold mt-1.5">
                    Overbudget alert! Check trip details.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Recommended Destinations */}
          <section className="bg-paper border border-rail rounded-xl p-5">
            <h3 className="font-serif text-lg font-medium m-0 mb-4 border-b border-wash pb-2">Popular Destinations</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 py-1">
                <span className="text-2xl w-12 h-12 rounded bg-wash flex items-center justify-center flex-shrink-0" aria-hidden="true">🇪🇸</span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold m-0 truncate">Barcelona, Spain</h4>
                  <div className="text-[0.78rem] text-muted flex gap-3 mt-0.5">
                    <span>Cost Index: <span className="text-transit-dark font-extrabold">$$</span> (65)</span>
                    <span>★ 92</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-1">
                <span className="text-2xl w-12 h-12 rounded bg-wash flex items-center justify-center flex-shrink-0" aria-hidden="true">🇯🇵</span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold m-0 truncate">Kyoto, Japan</h4>
                  <div className="text-[0.78rem] text-muted flex gap-3 mt-0.5">
                    <span>Cost Index: <span className="text-transit-dark font-extrabold">$$$</span> (75)</span>
                    <span>★ 88</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-1">
                <span className="text-2xl w-12 h-12 rounded bg-wash flex items-center justify-center flex-shrink-0" aria-hidden="true">🇮🇳</span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold m-0 truncate">Kochi, India</h4>
                  <div className="text-[0.78rem] text-muted flex gap-3 mt-0.5">
                    <span>Cost Index: <span className="text-transit-dark font-extrabold">$</span> (30)</span>
                    <span>★ 82</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-1">
                <span className="text-2xl w-12 h-12 rounded bg-wash flex items-center justify-center flex-shrink-0" aria-hidden="true">🇫🇷</span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold m-0 truncate">Paris, France</h4>
                  <div className="text-[0.78rem] text-muted flex gap-3 mt-0.5">
                    <span>Cost Index: <span className="text-transit-dark font-extrabold">$$$$</span> (85)</span>
                    <span>★ 95</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </aside>
      </main>

      {/* Plan Trip Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="w-full max-w-[480px] bg-paper rounded-lg shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 border-b border-wash flex justify-between items-center">
              <h3 id="dialog-title" className="m-0 font-serif text-xl font-medium">Plan New Trip</h3>
              <button
                onClick={() => setIsDialogOpen(false)}
                type="button"
                className="bg-transparent border-0 text-2xl cursor-pointer text-muted hover:text-ink p-1 flex items-center"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTrip} noValidate>
              <div className="p-6">
                
                <div className="grid gap-1 mb-4">
                  <label htmlFor="tripName" className="text-xs font-bold">Trip Name</label>
                  <input
                    id="tripName"
                    name="tripName"
                    type="text"
                    placeholder="e.g. Kerala Backwaters Escape"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    aria-describedby="tripName-error"
                    aria-invalid={!!nameError}
                    className="w-full min-h-[2.85rem] px-3.5 py-2.5 border border-[#b8c1bb] rounded text-ink bg-white outline-none focus:border-transit focus:ring-2 focus:ring-transit/13 transition"
                  />
                  <span className="min-h-[1rem] text-stamp text-xs" id="tripName-error">{nameError}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4">
                    <label htmlFor="startDate" className="text-xs font-bold">Start Date</label>
                    <input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      aria-describedby="startDate-error"
                      aria-invalid={!!startError}
                      className="w-full min-h-[2.85rem] px-3.5 py-2.5 border border-[#b8c1bb] rounded text-ink bg-white outline-none focus:border-transit focus:ring-2 focus:ring-transit/13 transition"
                    />
                    <span className="min-h-[1rem] text-stamp text-xs" id="startDate-error">{startError}</span>
                  </div>
                  <div className="grid gap-1 mb-4">
                    <label htmlFor="endDate" className="text-xs font-bold">End Date</label>
                    <input
                      id="endDate"
                      name="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      aria-describedby="endDate-error"
                      aria-invalid={!!endError}
                      className="w-full min-h-[2.85rem] px-3.5 py-2.5 border border-[#b8c1bb] rounded text-ink bg-white outline-none focus:border-transit focus:ring-2 focus:ring-transit/13 transition"
                    />
                    <span className="min-h-[1rem] text-stamp text-xs" id="endDate-error">{endError}</span>
                  </div>
                </div>

                <div className="grid gap-1 mb-4">
                  <label htmlFor="description" className="text-xs font-bold">Trip Description</label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="What is the mood of this journey?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[5.5rem] px-3.5 py-2.5 border border-[#b8c1bb] rounded text-ink bg-white outline-none focus:border-transit focus:ring-2 focus:ring-transit/13 transition resize-y"
                  />
                  <span className="min-h-[1rem] text-stamp text-xs" id="description-error" />
                </div>

                <div className="grid gap-1 mb-4">
                  <label htmlFor="budgetCap" className="text-xs font-bold">Budget Cap ($)</label>
                  <input
                    id="budgetCap"
                    name="budgetCap"
                    type="number"
                    min="0"
                    placeholder="e.g. 1500 (Optional)"
                    value={budgetCap}
                    onChange={(e) => setBudgetCap(e.target.value)}
                    aria-describedby="budgetCap-error"
                    aria-invalid={!!budgetError}
                    className="w-full min-h-[2.85rem] px-3.5 py-2.5 border border-[#b8c1bb] rounded text-ink bg-white outline-none focus:border-transit focus:ring-2 focus:ring-transit/13 transition"
                  />
                  <span className="min-h-[1rem] text-stamp text-xs" id="budgetCap-error">{budgetError}</span>
                </div>

                <div className="grid gap-1">
                  <label className="text-xs font-bold">Select Cover Style</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {(['style1', 'style2', 'style3', 'style4'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setSelectedCover(style)}
                        style={{ background: getCoverBg(style) }}
                        className={`h-12 rounded cursor-pointer border-2 flex items-center justify-center text-sm ${
                          selectedCover === style ? 'border-transit text-white shadow-md' : 'border-transparent text-transparent'
                        }`}
                      >
                        ✓
                      </button>
                    ))}
                  </div>
                </div>

              </div>
              <div className="px-6 py-4 border-t border-wash flex justify-end gap-3 bg-paper">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="bg-transparent border border-[#c9d0ca] hover:bg-[#f6f8f5] px-5 py-2.5 rounded-lg font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-transit hover:bg-transit-dark text-white font-bold px-5 py-2.5 rounded-lg border-0 cursor-pointer active:translate-y-[1px] disabled:opacity-75 disabled:pointer-events-none transition"
                >
                  {isSaving ? 'Saving...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
