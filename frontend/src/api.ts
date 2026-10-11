import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { loadFamilyDirectory, type FamilyFilters, type FamilyDirectory } from "./family-directory";

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
  if (!res.ok) throw new ApiError(typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map((e: any) => e.msg).join(" · ") : `Request failed (${res.status})`, res.status);
  return data;
}

export const AuthAPI = {
  signup: (email: string, password: string, name: string) => api("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) => api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => api("/auth/me"),
  changeEmail: (email: string, password: string) => api("/auth/email", { method: "POST", body: JSON.stringify({ email, password }) }),
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
  create: (body: any) => api("/playdates", { method: "POST", body: JSON.stringify(body) }),
  requests: (id: string) => api(`/playdates/${id}/requests`),
  approve: (id: string, reqId: string) => api(`/playdates/${id}/requests/${reqId}/approve`, { method: "POST" }),
  decline: (id: string, reqId: string) => api(`/playdates/${id}/requests/${reqId}/decline`, { method: "POST" }),
};

export const FamilyAPI = {
  directory: (params: FamilyFilters = {}): Promise<FamilyDirectory> => loadFamilyDirectory({
    list: filters => FamilyAPI.list(filters),
    playdates: () => PlaydatesAPI.list(),
    family: async id => { try { return await FamilyAPI.get(id); } catch (error) { if (error instanceof ApiError && [403, 404].includes(error.status)) return null; throw error; } },
    missingEndpoint: error => error instanceof ApiError && error.status === 404,
  }, params),
  list: (params: FamilyFilters = {}): Promise<any[]> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
    return api(`/families?${query}`);
  },
  get: (id: string) => api(`/families/${id}`),
};

export const SafetyAPI = {
  block: (target_family_id: string) => api("/safety/block", { method: "POST", body: JSON.stringify({ target_family_id }) }),
  unblock: (target_family_id: string) => api("/safety/unblock", { method: "POST", body: JSON.stringify({ target_family_id }) }),
  report: (target_family_id: string, reason: string) => api("/safety/report", { method: "POST", body: JSON.stringify({ target_family_id, reason }) }),
};

export const ForumAPI = {
  create: (body: { title: string; body: string; topic: string }) => api("/forum", { method: "POST", body: JSON.stringify(body) }),
  list: () => api("/forum"),
  get: (id: string) => api(`/forum/${id}`),
};

export const ResourcesAPI = {
  list: () => api("/resources"),
  save: (id: string) => api(`/resources/${id}/save`, { method: "POST" }),
  unsave: (id: string) => api(`/resources/${id}/unsave`, { method: "POST" }),
  saved: () => api("/profile/saved-resources"),
};

export const ThreadsAPI = {
  list: () => api("/threads"),
  get: (id: string) => api(`/threads/${id}`),
  send: (id: string, text: string, client_message_id?: string) => api(`/threads/${id}/messages`, { method: "POST", body: JSON.stringify({ text, client_message_id }) }),
  request: (target_family_id: string, opening_message: string) => api("/threads/request", { method: "POST", body: JSON.stringify({ target_family_id, opening_message }) }),
  accept: (id: string) => api(`/threads/${id}/accept`, { method: "POST" }),
  decline: (id: string) => api(`/threads/${id}/decline`, { method: "POST" }),
};

export type NotificationPreferences = { messages: boolean; playdates: boolean; community: boolean };
export const LocationAPI = {
  availability: async (): Promise<{ available: boolean; point: { latitude: number; longitude: number } | null }> => {
    try { return { available: true, point: await api("/profile/location") }; }
    catch (error) { if (error instanceof ApiError && error.status === 404) return { available: false, point: null }; throw error; }
  },
  get: () => api("/profile/location"),
  save: (latitude: number, longitude: number) => api("/profile/location", { method: "PUT", body: JSON.stringify({ latitude, longitude }) }),
  remove: () => api("/profile/location", { method: "DELETE" }),
};
export const VerificationAPI = {
  get: () => api("/profile/verification"),
  submit: (statement: string, consent: boolean) => api("/profile/verification", { method: "POST", body: JSON.stringify({ statement, consent }) }),
  pending: () => api("/admin/verification"),
  review: (id: string, status: "approved" | "rejected", reason: string) => api(`/admin/verification/${id}`, { method: "POST", body: JSON.stringify({ status, reason }) }),
};
export const NotificationsAPI = {
  preferences: (): Promise<NotificationPreferences> => api("/notifications/preferences"),
  savePreferences: (body: NotificationPreferences) => api("/notifications/preferences", { method: "PUT", body: JSON.stringify(body) }),
  register: (token: string, platform: string) => api("/notifications/devices", { method: "POST", body: JSON.stringify({ token, platform }) }),
  unregister: (token: string) => api("/notifications/devices", { method: "DELETE", body: JSON.stringify({ token }) }),
  list: () => api("/notifications"),
  readAll: () => api("/notifications/read-all", { method: "POST" }),
};
