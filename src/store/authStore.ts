import { create } from 'zustand';
import { supabase } from '../supabase/client';
import { User } from '../types/database';

interface AuthState {
  session: any | null;
  user: User | null;
  isLoading: boolean;
  setSession: (session: any) => void;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));