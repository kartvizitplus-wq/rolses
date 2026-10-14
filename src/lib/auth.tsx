import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../data';
import type { Profile } from '../types';

interface AuthState {
  ready: boolean;
  userId: string | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  ready: false,
  userId: null,
  profile: null,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (id: string | null) => {
    if (!id) {
      setProfile(null);
      return;
    }
    try {
      // Yeni Google kullanıcısında profil tetikleyiciyle oluşur; kısa bir gecikme olabilir.
      let p = await api.getProfile(id);
      if (!p) {
        await new Promise((r) => setTimeout(r, 800));
        p = await api.getProfile(id);
      }
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api.currentUserId().then(async (id) => {
      if (!alive) return;
      setUserId(id);
      await loadProfile(id);
      if (alive) setReady(true);
    });
    const off = api.onAuthChange((id) => {
      setUserId(id);
      loadProfile(id);
    });
    return () => {
      alive = false;
      off();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(userId), [loadProfile, userId]);

  return (
    <AuthContext.Provider value={{ ready, userId, profile, refreshProfile }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
