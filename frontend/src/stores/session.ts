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
  token: localStorage.getItem('tripcraft_token'),
  user: localStorage.getItem('tripcraft_user')
    ? JSON.parse(localStorage.getItem('tripcraft_user')!)
    : null,
  setSession: (token, user) => {
    localStorage.setItem('tripcraft_token', token);
    localStorage.setItem('tripcraft_user', JSON.stringify(user));
    set({ token, user });
  },
  clearSession: () => {
    localStorage.removeItem('tripcraft_token');
    localStorage.removeItem('tripcraft_user');
    set({ token: null, user: null });
  },
}));
