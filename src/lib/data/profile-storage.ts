"use client";

import { useSyncExternalStore } from "react";
import { mockUser } from "@/lib/data/mock/fixtures";
import type { AgeBand, UserProfile } from "@/lib/data/types";
import {
  advancementTitleFromLevel,
  levelFromTotalExperience,
} from "@/lib/progression/experience";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

export const PROFILE_STORAGE_KEY = "debate-profile-v1";
export const AGE_BAND_STORAGE_KEY = "debate-age-band-v1";
const DEFAULT_AGE_BAND: AgeBand = "10-14";

const profileListeners = new Set<() => void>();
let cachedStorageRaw: string | null = null;
let cachedProfileSnapshot: UserProfile = mockUser;
let authListenerRegistered = false;

function normalizeAgeBand(value: unknown): AgeBand {
  return value === "under10" ||
    value === "10-14" ||
    value === "15-18" ||
    value === "18+"
    ? value
    : DEFAULT_AGE_BAND;
}

export function getAgeBandPreference(): AgeBand {
  if (typeof window === "undefined") return DEFAULT_AGE_BAND;
  const raw = window.localStorage.getItem(AGE_BAND_STORAGE_KEY);
  return normalizeAgeBand(raw);
}

export function setAgeBandPreference(ageBand: AgeBand): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AGE_BAND_STORAGE_KEY, ageBand);
}

type ProfilePatch = Pick<UserProfile, "displayName" | "avatarUrl" | "totalExperience">;

export const MINECRAFT_AVATAR_OPTIONS = [
  { id: "steve", label: "Steve", url: "https://mc-heads.net/avatar/Steve/96" },
  { id: "alex", label: "Alex", url: "https://mc-heads.net/avatar/Alex/96" },
  { id: "creeper", label: "Creeper", url: "https://mc-heads.net/avatar/Creeper/96" },
  { id: "enderman", label: "Enderman", url: "https://mc-heads.net/avatar/Enderman/96" },
  { id: "villager", label: "Villager", url: "https://mc-heads.net/avatar/Villager/96" },
  { id: "zombie", label: "Zombie", url: "https://mc-heads.net/avatar/Zombie/96" },
] as const;

function randomMinecraftAvatarUrl(): string {
  const index = Math.floor(Math.random() * MINECRAFT_AVATAR_OPTIONS.length);
  return (
    MINECRAFT_AVATAR_OPTIONS[index]?.url ??
    MINECRAFT_AVATAR_OPTIONS[0]?.url ??
    mockUser.avatarUrl
  );
}

function isAllowedMinecraftAvatar(url: string): boolean {
  return MINECRAFT_AVATAR_OPTIONS.some((avatar) => avatar.url === url);
}

export function pickMinecraftAvatarBySeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const index = hash % MINECRAFT_AVATAR_OPTIONS.length;
  return MINECRAFT_AVATAR_OPTIONS[index]?.url ?? mockUser.avatarUrl;
}

function coerceTotalExperience(raw: unknown): number {
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))
        ? Number(raw)
        : 0;
  return Math.max(0, Math.min(Math.floor(n), 1_000_000_000_000));
}

function sanitizePatch(value: unknown): ProfilePatch {
  if (!value || typeof value !== "object") {
    return {
      displayName: mockUser.displayName,
      avatarUrl: mockUser.avatarUrl,
      totalExperience: 0,
    };
  }
  const input = value as Record<string, unknown>;
  const displayName =
    typeof input.displayName === "string" && input.displayName.trim().length > 0
      ? input.displayName.trim().slice(0, 24)
      : mockUser.displayName;
  const avatarUrl =
    typeof input.avatarUrl === "string" && input.avatarUrl.trim().length > 0
      ? input.avatarUrl.trim()
      : mockUser.avatarUrl;
  const totalExperience = coerceTotalExperience(input.totalExperience);
  return { displayName, avatarUrl, totalExperience };
}

function readStoredPatch(): ProfilePatch | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return sanitizePatch(JSON.parse(raw));
  } catch {
    return null;
  }
}

function buildSnapshotFromPatch(patch: ProfilePatch | null): UserProfile {
  if (!patch) return { ...mockUser };
  const te = patch.totalExperience ?? 0;
  const level = levelFromTotalExperience(te);
  return {
    ...mockUser,
    id: mockUser.id,
    displayName: patch.displayName,
    avatarUrl: patch.avatarUrl,
    totalExperience: te,
    level,
    rankLabel: advancementTitleFromLevel(level),
  };
}

function notifyProfile(): void {
  profileListeners.forEach((listener) => listener());
}

function rowToProfile(
  row: {
    id: string;
    display_name: string;
    avatar_url: string;
    level: number;
    rank_label: string;
    total_experience: number | null;
  },
): UserProfile {
  const totalExperience = coerceTotalExperience(row.total_experience);
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    level: row.level,
    rankLabel: row.rank_label,
    totalExperience,
  };
}

async function refreshProfileFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured() || typeof window === "undefined") return;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, level, rank_label, total_experience")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  cachedProfileSnapshot = rowToProfile(data);
  cachedStorageRaw = "__remote__";
  notifyProfile();
}

/** Reload profile from Supabase after server-side XP changes (e.g. new debate_results row). */
export async function refreshUserProfileFromServer(): Promise<void> {
  await refreshProfileFromSupabase();
}

/** Guest / localStorage only: apply XP after a debate (authed users earn XP on the server). */
export function applyGuestExperienceDelta(delta: number): void {
  if (typeof window === "undefined" || delta <= 0) return;
  ensureAuthListener();
  if (cachedStorageRaw === "__remote__") return;

  const patch = readStoredPatch();
  const base = buildSnapshotFromPatch(patch);
  const nextTotal = Math.max(0, base.totalExperience + delta);
  const nextPatch = sanitizePatch({
    displayName: base.displayName,
    avatarUrl: base.avatarUrl,
    totalExperience: nextTotal,
  });
  const serialized = JSON.stringify(nextPatch);
  window.localStorage.setItem(PROFILE_STORAGE_KEY, serialized);
  cachedStorageRaw = serialized;
  cachedProfileSnapshot = buildSnapshotFromPatch(nextPatch);
  notifyProfile();
}

function ensureAuthListener(): void {
  if (authListenerRegistered || typeof window === "undefined" || !isSupabaseConfigured()) {
    return;
  }
  authListenerRegistered = true;
  const supabase = createClient();
  void refreshProfileFromSupabase();
  supabase.auth.onAuthStateChange((event) => {
    if (
      event === "SIGNED_IN" ||
      event === "TOKEN_REFRESHED" ||
      event === "USER_UPDATED"
    ) {
      void refreshProfileFromSupabase();
    }
    if (event === "SIGNED_OUT") {
      cachedProfileSnapshot = buildSnapshotFromPatch(readStoredPatch());
      cachedStorageRaw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      notifyProfile();
    }
  });
}

export function getUserProfileSnapshot(): UserProfile {
  if (typeof window === "undefined") return mockUser;
  ensureAuthListener();
  if (cachedStorageRaw === "__remote__") {
    return cachedProfileSnapshot;
  }

  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (raw === cachedStorageRaw) {
    return cachedProfileSnapshot;
  }

  cachedStorageRaw = raw;
  const patch = readStoredPatch();
  cachedProfileSnapshot = buildSnapshotFromPatch(patch);
  return cachedProfileSnapshot;
}

export async function updateUserProfile(
  patch: Partial<ProfilePatch>,
): Promise<UserProfile> {
  if (typeof window === "undefined") return mockUser;

  const current = getUserProfileSnapshot();
  const nextPatch = sanitizePatch({
    displayName: patch.displayName ?? current.displayName,
    avatarUrl: patch.avatarUrl ?? current.avatarUrl,
    totalExperience: patch.totalExperience ?? current.totalExperience,
  });

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: nextPatch.displayName,
          avatar_url: nextPatch.avatarUrl,
        })
        .eq("id", session.user.id);
      if (!error) {
        cachedProfileSnapshot = {
          ...current,
          displayName: nextPatch.displayName,
          avatarUrl: nextPatch.avatarUrl,
          totalExperience: current.totalExperience,
          id: session.user.id,
        };
        cachedStorageRaw = "__remote__";
        notifyProfile();
        void refreshProfileFromSupabase();
        return cachedProfileSnapshot;
      }
    }
  }

  const raw = JSON.stringify(nextPatch);
  window.localStorage.setItem(PROFILE_STORAGE_KEY, raw);
  cachedStorageRaw = raw;
  cachedProfileSnapshot = buildSnapshotFromPatch(nextPatch);
  notifyProfile();
  return cachedProfileSnapshot;
}

function initLocalGuestProfile(): UserProfile {
  const nextPatch: ProfilePatch = {
    displayName: mockUser.displayName,
    avatarUrl: randomMinecraftAvatarUrl(),
    totalExperience: 0,
  };
  const serialized = JSON.stringify(nextPatch);
  window.localStorage.setItem(PROFILE_STORAGE_KEY, serialized);
  cachedStorageRaw = serialized;
  cachedProfileSnapshot = buildSnapshotFromPatch(nextPatch);
  notifyProfile();
  return cachedProfileSnapshot;
}

export function ensureUserProfileInitialized(): UserProfile {
  if (typeof window === "undefined") return mockUser;
  ensureAuthListener();

  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (raw) {
    const current = getUserProfileSnapshot();
    if (isAllowedMinecraftAvatar(current.avatarUrl)) {
      return current;
    }

    const migratedPatch: ProfilePatch = {
      displayName: current.displayName,
      avatarUrl: randomMinecraftAvatarUrl(),
      totalExperience: current.totalExperience,
    };
    const migratedRaw = JSON.stringify(migratedPatch);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, migratedRaw);
    cachedStorageRaw = migratedRaw;
    cachedProfileSnapshot = buildSnapshotFromPatch(migratedPatch);
    notifyProfile();
    return cachedProfileSnapshot;
  }

  if (isSupabaseConfigured()) {
    void createClient().auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await refreshProfileFromSupabase();
      } else if (!window.localStorage.getItem(PROFILE_STORAGE_KEY)) {
        initLocalGuestProfile();
      }
    });
    if (cachedStorageRaw === "__remote__") {
      return cachedProfileSnapshot;
    }
    return mockUser;
  }

  return initLocalGuestProfile();
}

function subscribeToProfile(callback: () => void): () => void {
  profileListeners.add(callback);
  ensureAuthListener();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PROFILE_STORAGE_KEY) return;
    callback();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    profileListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function useUserProfile(): UserProfile {
  return useSyncExternalStore(
    subscribeToProfile,
    getUserProfileSnapshot,
    () => mockUser,
  );
}
