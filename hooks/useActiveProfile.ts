"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "parent_active_profile_id";

export function useActiveProfile() {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveProfileId(stored);
  }, []);

  const setActive = useCallback((id: string) => {
    setActiveProfileId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const clear = useCallback(() => {
    setActiveProfileId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { activeProfileId, setActive, clear };
}
