"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const STORAGE_KEY = "homedesign_anonymous_user";

/**
 * Creates or retrieves an anonymous user identity stored in localStorage.
 */
export function useAnonymousUser() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const getOrCreate = useMutation(api.users.getOrCreate);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.userId) {
          setUserId(parsed.userId as Id<"users">);
          setIsReady(true);
          return;
        }
      } catch {
        // ignore
      }
    }

    const anonId = Math.random().toString(36).slice(2, 10);
    const email = `anon-${anonId}@homedesign.local`;
    getOrCreate({ name: `Anonymous ${anonId}`, email })
      .then((id) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: id, email }));
        setUserId(id);
        setIsReady(true);
      })
      .catch((err) => {
        console.warn("Failed to create anonymous user:", err);
        setIsReady(true);
      });
  }, [getOrCreate]);

  return { userId, isReady };
}
