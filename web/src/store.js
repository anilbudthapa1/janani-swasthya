import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuth = create(persist((set) => ({
  token: null,
  user: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null })
}), { name: 'janani-auth' }));
