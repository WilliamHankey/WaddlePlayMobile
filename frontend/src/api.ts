import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = "waddleplay_token";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null; } catch { return null; }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (token === null) globalThis.localStorage?.removeItem(TOKEN_KEY);
      else globalThis.localStorage?.setItem(TOKEN_KEY, token);
    } catch { /* ignore */ }
    return;
  }
  if (token === null) await SecureStore.deleteItemAsync(TOKEN_KEY);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
  if (!res.ok) throw new ApiError(data.detail || `Request failed (${res.status})`, res.status);
  return data;
}

export const AuthAPI = {
  signup: (email: string, password: string, name: string) => api("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) => api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => api("/auth/me"),
};

export const ProfileAPI = {
  getMe: () => api("/profile/me"),
  update: (body: any) => api("/profile/me", { method: "PUT", body: JSON.stringify(body) }),
};

export const PlaydatesAPI = {
  list: (params?: { category?: string; age_min?: number; age_max?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.age_min != null) q.set("age_min", String(params.age_min));
    if (params?.age_max != null) q.set("age_max", String(params.age_max));
    const s = q.toString();
    return api(`/playdates${s ? `?${s}` : ""}`);
  },
  get: (id: string) => api(`/playdates/${id}`),
  join: (id: string) => api(`/playdates/${id}/join`, { method: "POST" }),
};

export const FamilyAPI = {
  get: (id: string) => api(`/families/${id}`),
};

export const SafetyAPI = {
  block: (target_family_id: string) => api("/safety/block", { method: "POST", body: JSON.stringify({ target_family_id }) }),
  unblock: (target_family_id: string) => api("/safety/unblock", { method: "POST", body: JSON.stringify({ target_family_id }) }),
  report: (target_family_id: string, reason: string) => api("/safety/report", { method: "POST", body: JSON.stringify({ target_family_id, reason }) }),
};
