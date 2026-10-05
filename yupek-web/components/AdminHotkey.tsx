"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * AdminHotkey listens globally for the secret shortcut Alt + A (or Option + A on macOS)
 * and navigates directly to the atelier admin panel (/admin).
 */
export default function AdminHotkey() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Alt/Option + A
      if (e.altKey && (e.code === "KeyA" || e.key.toLowerCase() === "a")) {
        e.preventDefault();
        router.push("/admin");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
