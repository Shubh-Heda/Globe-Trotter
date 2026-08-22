import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  fullName: string;
  homeCityId: number | null;
  avatarPath: string | null;
  role: string;
}

interface SessionState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  token: localStorage.getItem('globetrotter_token'),
  user: localStorage.getItem('globetrotter_user')
    ? JSON.parse(localStorage.getItem('globetrotter_user')!)
    : null,
  setSession: (token, user) => {
    localStorage.setItem('globetrotter_token', token);
    localStorage.setItem('globetrotter_user', JSON.stringify(user));
    set({ token, user });
  },
  clearSession: () => {
    localStorage.removeItem('globetrotter_token');
    localStorage.removeItem('globetrotter_user');
    set({ token: null, user: null });
  },
}));
