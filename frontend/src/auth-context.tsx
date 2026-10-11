import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthAPI, getToken, setToken } from "./api";
import { queryClient } from "./query-client";
import { unregisterPush } from "./push";

type User = { id: string; email: string; name: string };

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  changeEmail: (email: string, password: string) => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await getToken();
        if (t) {
          const me = await AuthAPI.me();
          setUser(me);
        }
      } catch { await setToken(null); }
      finally { setLoading(false); }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await AuthAPI.login(email, password);
    await setToken(res.access_token);
    setUser({ id: res.user_id, email: res.email, name: res.name });
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const res = await AuthAPI.signup(email, password, name);
    await setToken(res.access_token);
    setUser({ id: res.user_id, email: res.email, name: res.name });
  }, []);

  const signOut = useCallback(async () => {
    // Refuse to leave a device subscribed to this account if deregistration fails.
    await unregisterPush();
    await setToken(null);
    queryClient.clear();
    setUser(null);
  }, []);
  const changeEmail = useCallback(async (email: string, password: string) => {
    const result = await AuthAPI.changeEmail(email, password);
    await setToken(result.access_token);
    setUser(result.user);
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signUp, signOut, changeEmail }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
