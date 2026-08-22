import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Landing from './pages/Landing.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import Dashboard from './pages/Dashboard.tsx';
import MyTrips from './pages/MyTrips.tsx';
import CreateTrip from './pages/CreateTrip.tsx';
import TripDetail from './pages/TripDetail.tsx';
import Search from './pages/Search.tsx';
import Budget from './pages/Budget.tsx';
import Calendar from './pages/Calendar.tsx';
import PublicTrip from './pages/PublicTrip.tsx';
import Profile from './pages/Profile.tsx';
import Admin from './pages/Admin.tsx';
import { useSessionStore } from './stores/session.ts';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((state) => state.token);
  return !token ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

/** Landing page for unauthenticated visitors; logged-in users go to /dashboard. */
function RootRoute() {
  const token = useSessionStore((state) => state.token);
  return token ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page at root */}
        <Route path="/" element={<RootRoute />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* No auth required — the one screen a logged-out visitor can see. */}
        <Route path="/public/:slug" element={<PublicTrip />} />

        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trips" element={<MyTrips />} />
          <Route path="/trips/new" element={<CreateTrip />} />
          <Route path="/trips/:tripId" element={<TripDetail />} />
          <Route path="/trips/:tripId/budget" element={<Budget />} />
          <Route path="/trips/:tripId/calendar" element={<Calendar />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
