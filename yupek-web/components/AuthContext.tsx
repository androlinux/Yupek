"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export interface UserOrder {
  id: string;
  date: string;
  status: "Processing" | "In Transit" | "Delivered";
  total: number;
  tracking: string;
  items: Array<{
    slug: string;
    name: string;
    size: string;
    color: string;
    qty: number;
    price: number;
    image: string;
  }>;
}

export interface UserAddress {
  fullName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: "customer" | "admin";
  provider: "google" | "apple" | "email" | "demo";
  orders: UserOrder[];
  address: UserAddress;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  quickDemoLogin: (role?: "customer" | "admin") => void;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<AuthUser>) => void;
  updateAddress: (address: UserAddress) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_STORAGE_KEY = "yupek_client_auth_v2";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Sync user's real orders from the server
  const syncServerOrders = useCallback(async (clientEmail: string) => {
    try {
      const res = await fetch(`/api/auth?email=${encodeURIComponent(clientEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setUser((prev) => {
          if (!prev || prev.email.toLowerCase() !== clientEmail.toLowerCase()) return prev;
          const updated: AuthUser = {
            ...prev,
            orders: data.orders,
            address: prev.address?.street ? prev.address : (data.user?.address || prev.address),
          };
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Initialize from localStorage and sync
  useEffect(() => {
    try {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      if (cached) {
        const parsed: AuthUser = JSON.parse(cached);
        setUser(parsed);
        // Refresh orders in background
        if (parsed.email) {
          syncServerOrders(parsed.email);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [syncServerOrders]);

  // Real client Sign In via /api/auth
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: email.trim(),
          password: pass.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Invalid email or password. Please verify your details.",
        };
      }

      const clientUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone,
        role: data.user.role || "customer",
        provider: "email",
        orders: data.orders || [],
        address: data.user.address || {
          fullName: data.user.name,
          street: "",
          city: "",
          postalCode: "",
          country: "Netherlands",
          phone: data.user.phone || "",
        },
        createdAt: data.user.createdAt,
      };

      setUser(clientUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(clientUser));
      setAuthModalOpen(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection error. Please try again.";
      return { success: false, error: msg };
    }
  }, []);

  // Real client Sign Up / Register via /api/auth
  const signUpWithEmail = useCallback(async (email: string, pass: string, name: string, phone?: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name: name.trim(),
          email: email.trim(),
          password: pass.trim(),
          phone: phone ? phone.trim() : "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Unable to create account. Please check your information.",
        };
      }

      const clientUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone,
        role: "customer",
        provider: "email",
        orders: data.orders || [],
        address: data.user.address || {
          fullName: data.user.name,
          street: "",
          city: "",
          postalCode: "",
          country: "Netherlands",
          phone: data.user.phone || "",
        },
        createdAt: data.user.createdAt,
      };

      setUser(clientUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(clientUser));
      setAuthModalOpen(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration error. Please try again.";
      return { success: false, error: msg };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (user?.id) {
      try {
        await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_profile",
            id: user.id,
            email: user.email,
            name: updates.name,
            phone: updates.phone,
            address: updates.address,
          }),
        });
      } catch {}
    }
  }, [user]);

  // Update address
  const updateAddress = useCallback(async (newAddress: UserAddress): Promise<boolean> => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, address: newAddress };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (user?.id) {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_profile",
            id: user.id,
            email: user.email,
            address: newAddress,
          }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      }
    }
    return true;
  }, [user]);

  // Refresh client orders on demand
  const refreshOrders = useCallback(async () => {
    if (user?.email) {
      await syncServerOrders(user.email);
    }
  }, [user, syncServerOrders]);

  // OAuth Google
  const signInWithGoogle = useCallback(async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/account`,
        },
      });
    } catch (err) {
      console.warn("Google OAuth error", err);
    }
  }, []);

  // OAuth Apple
  const signInWithApple = useCallback(async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${origin}/auth/callback?next=/account`,
        },
      });
    } catch (err) {
      console.warn("Apple OAuth error", err);
    }
  }, []);

  // Legacy fallback if referenced anywhere
  const quickDemoLogin = useCallback((role: "customer" | "admin" = "customer") => {
    if (role === "admin") {
      const adminObj: AuthUser = {
        id: "admin-yupek-01",
        email: "daniyarow16@gmail.com",
        name: "YUPEK Master Atelier",
        role: "admin",
        provider: "demo",
        orders: [],
        address: {
          fullName: "YUPEK Head Office",
          street: "Keizersgracht 482",
          city: "Amsterdam",
          postalCode: "1016 GD",
          country: "Netherlands",
          phone: "+31644154126",
        },
      };
      setUser(adminObj);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(adminObj));
    }
    setAuthModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authModalOpen,
        setAuthModalOpen,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        quickDemoLogin,
        signOut,
        updateProfile,
        updateAddress,
        refreshOrders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
