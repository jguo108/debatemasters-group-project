"use client";

import { useSyncExternalStore } from "react";
import { mockUser } from "@/lib/data/mock/fixtures";
import type { UserProfile } from "@/lib/data/types";

const PROFILE_STORAGE_KEY = "debate-profile-v1";
const profileListeners = new Set<() => void>();
let cachedStorageRaw: string | null = null;
let cachedProfileSnapshot: UserProfile = mockUser;

type ProfilePatch = Pick<UserProfile, "displayName" | "avatarUrl">;

export const MINECRAFT_AVATAR_OPTIONS = [
  { id: "steve", label: "Steve", url: "https://mc-heads.net/avatar/Steve/96" },
  { id: "alex", label: "Alex", url: "https://mc-heads.net/avatar/Alex/96" },
  { id: "creeper", label: "Creeper", url: "https://mc-heads.net/avatar/Creeper/96" },
  { id: "enderman", label: "Enderman", url: "https://mc-heads.net/avatar/Enderman/96" },
  { id: "villager", label: "Villager", url: "https://mc-heads.net/avatar/Villager/96" },
  { id: "zombie", label: "Zombie", url: "https://mc-heads.net/avatar/Zombie/96" },
] as const;

const MINECRAFT_AVATAR_URLS = new Set(
  MINECRAFT_AVATAR_OPTIONS.map((avatar) => avatar.url),
);

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

function sanitizePatch(value: unknown): ProfilePatch {
  if (!value || typeof value !== "object") {
    return {
      displayName: mockUser.displayName,
      avatarUrl: mockUser.avatarUrl,
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
  return { displayName, avatarUrl };
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
  if (!patch) return mockUser;
  return {
    ...mockUser,
    ...patch,
  };
}

export function getUserProfileSnapshot(): UserProfile {
  if (typeof window === "undefined") return mockUser;
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (raw === cachedStorageRaw) return cachedProfileSnapshot;

  cachedStorageRaw = raw;
  const patch = readStoredPatch();
  cachedProfileSnapshot = buildSnapshotFromPatch(patch);
  return cachedProfileSnapshot;
}

export function updateUserProfile(patch: Partial<ProfilePatch>): UserProfile {
  if (typeof window === "undefined") return mockUser;
  const current = getUserProfileSnapshot();
  const nextPatch = sanitizePatch({
    displayName: patch.displayName ?? current.displayName,
    avatarUrl: patch.avatarUrl ?? current.avatarUrl,
  });
  const raw = JSON.stringify(nextPatch);
  window.localStorage.setItem(PROFILE_STORAGE_KEY, raw);
  cachedStorageRaw = raw;
  cachedProfileSnapshot = {
    ...mockUser,
    ...nextPatch,
  };
  profileListeners.forEach((listener) => listener());
  return cachedProfileSnapshot;
}

export function ensureUserProfileInitialized(): UserProfile {
  if (typeof window === "undefined") return mockUser;
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (raw) {
    const current = getUserProfileSnapshot();
    if (isAllowedMinecraftAvatar(current.avatarUrl)) {
      return current;
    }

    const migratedPatch: ProfilePatch = {
      displayName: current.displayName,
      avatarUrl: randomMinecraftAvatarUrl(),
    };
    const migratedRaw = JSON.stringify(migratedPatch);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, migratedRaw);
    cachedStorageRaw = migratedRaw;
    cachedProfileSnapshot = {
      ...mockUser,
      ...migratedPatch,
    };
    profileListeners.forEach((listener) => listener());
    return cachedProfileSnapshot;
  }

  const nextPatch: ProfilePatch = {
    displayName: mockUser.displayName,
    avatarUrl: randomMinecraftAvatarUrl(),
  };
  const serialized = JSON.stringify(nextPatch);
  window.localStorage.setItem(PROFILE_STORAGE_KEY, serialized);
  cachedStorageRaw = serialized;
  cachedProfileSnapshot = {
    ...mockUser,
    ...nextPatch,
  };
  profileListeners.forEach((listener) => listener());
  return cachedProfileSnapshot;
}

function subscribeToProfile(callback: () => void): () => void {
  profileListeners.add(callback);
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
