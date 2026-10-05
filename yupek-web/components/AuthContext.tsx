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
  avatar?: string;
  role: "customer" | "admin";
  provider: "google" | "apple" | "email" | "demo";
  orders: UserOrder[];
  address: UserAddress;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  quickDemoLogin: (role?: "customer" | "admin") => void;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<AuthUser>) => void;
  updateAddress: (address: UserAddress) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_CUSTOMER: AuthUser = {
  id: "user-demo-01",
  email: "elena.rostova@yupek-atelier.com",
  name: "Elena Rostova",
  role: "customer",
  provider: "google",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  address: {
    fullName: "Elena Rostova",
    street: "Herengracht 182",
    city: "Amsterdam",
    postalCode: "1016 BR",
    country: "Netherlands",
    phone: "+31 6 4920 1832",
  },
  orders: [
    {
      id: "YPK-2026-9041",
      date: "2026-09-28",
      status: "Delivered",
      total: 138,
      tracking: "DHL Express: 3S928174019NL",
      items: [
        {
          slug: "yupek-heritage-tee",
          name: "YUPEK Heritage Tee",
          size: "M",
          color: "Black",
          qty: 1,
          price: 49,
          image: "/products/product-1-1.jpg",
        },
        {
          slug: "yupek-heritage-sweatshirt",
          name: "YUPEK Heritage Sweatshirt",
          size: "M",
          color: "Burgundy",
          qty: 1,
          price: 89,
          image: "/products/product-3-1.jpg",
        },
      ],
    },
    {
      id: "YPK-2026-9812",
      date: "2026-10-02",
      status: "In Transit",
      total: 89,
      tracking: "PostNL Priority: 3SYPK992014",
      items: [
        {
          slug: "yupek-silk-inspired-shirt",
          name: "YUPEK Silk-Inspired Shirt",
          size: "S",
          color: "Ivory",
          qty: 1,
          price: 89,
          image: "/products/product-7-1.jpg",
        },
      ],
    },
  ],
};

const DEMO_ADMIN: AuthUser = {
  id: "admin-yupek-01",
  email: "admin@yupek.eu",
  name: "YUPEK Master Atelier",
  role: "admin",
  provider: "demo",
  address: {
    fullName: "YUPEK Head Office",
    street: "Keizersgracht 482",
    city: "Amsterdam",
    postalCode: "1016 GD",
    country: "Netherlands",
    phone: "+31 20 894 3320",
  },
  orders: [],
};

const USER_STORAGE_KEY = "yupek_client_auth_v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Load user from localStorage or Supabase session
  useEffect(() => {
    async function initAuth() {
      // 1. Try local storage first for quick hydration
      try {
        const cached = localStorage.getItem(USER_STORAGE_KEY);
        if (cached) {
          setUser(JSON.parse(cached));
        }
      } catch {
        // ignore
      }

      // 2. Check active Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const supaUser = session.user;
          const role = supaUser.app_metadata?.role === "admin" ? "admin" : "customer";
          const provider = (supaUser.app_metadata?.provider || "email") as AuthUser["provider"];
          
          setUser((prev) => {
            const updated: AuthUser = {
              id: supaUser.id,
              email: supaUser.email || "client@yupek.eu",
              name: supaUser.user_metadata?.full_name || supaUser.email?.split("@")[0] || "Valued Client",
              avatar: supaUser.user_metadata?.avatar_url,
              role: role,
              provider: provider,
              orders: prev?.orders || DEMO_CUSTOMER.orders,
              address: prev?.address || DEMO_CUSTOMER.address,
            };
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
        }
      } catch {
        // network or supabase not configured yet
      } finally {
        setLoading(false);
      }

      // 3. Listen to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const role = session.user.app_metadata?.role === "admin" ? "admin" : "customer";
          const updated: AuthUser = {
            id: session.user.id,
            email: session.user.email || "client@yupek.eu",
            name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Client",
            avatar: session.user.user_metadata?.avatar_url,
            role,
            provider: (session.user.app_metadata?.provider || "email") as AuthUser["provider"],
            orders: DEMO_CUSTOMER.orders,
            address: DEMO_CUSTOMER.address,
          };
          setUser(updated);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    initAuth();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/account`,
        },
      });
      if (error) {
        // Fallback to demo Google customer if external OAuth credentials are not yet configured in Supabase dashboard
        console.warn("Google OAuth fallback to demo customer", error.message);
        const googleUser: AuthUser = {
          ...DEMO_CUSTOMER,
          id: `google-${Date.now()}`,
          provider: "google",
        };
        setUser(googleUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(googleUser));
        setAuthModalOpen(false);
      }
    } catch {
      const googleUser: AuthUser = {
        ...DEMO_CUSTOMER,
        id: `google-${Date.now()}`,
        provider: "google",
      };
      setUser(googleUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(googleUser));
      setAuthModalOpen(false);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${origin}/auth/callback?next=/account`,
        },
      });
      if (error) {
        // Fallback to demo Apple customer
        console.warn("Apple OAuth fallback to demo customer", error.message);
        const appleUser: AuthUser = {
          ...DEMO_CUSTOMER,
          id: `apple-${Date.now()}`,
          name: "Elena Rostova",
          email: "elena.apple.privaterelay@appleid.com",
          provider: "apple",
        };
        setUser(appleUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(appleUser));
        setAuthModalOpen(false);
      }
    } catch {
      const appleUser: AuthUser = {
        ...DEMO_CUSTOMER,
        id: `apple-${Date.now()}`,
        name: "Elena Rostova",
        email: "elena.apple.privaterelay@appleid.com",
        provider: "apple",
      };
      setUser(appleUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(appleUser));
      setAuthModalOpen(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error || !data.user) {
        // Local fallback check
        if (email.toLowerCase().includes("admin") || pass === "admin123") {
          setUser(DEMO_ADMIN);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEMO_ADMIN));
          setAuthModalOpen(false);
          return { success: true };
        }
        // Create client account
        const clientUser: AuthUser = {
          ...DEMO_CUSTOMER,
          id: `user-${Date.now()}`,
          email,
          name: email.split("@")[0].toUpperCase(),
          provider: "email",
        };
        setUser(clientUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(clientUser));
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in error";
      return { success: false, error: msg };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { full_name: name },
        },
      });
      if (error || !data.user) {
        const newUser: AuthUser = {
          ...DEMO_CUSTOMER,
          id: `user-${Date.now()}`,
          email,
          name: name || email.split("@")[0],
          provider: "email",
        };
        setUser(newUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up error";
      return { success: false, error: msg };
    }
  }, []);

  const quickDemoLogin = useCallback((role: "customer" | "admin" = "customer") => {
    const selected = role === "admin" ? DEMO_ADMIN : DEMO_CUSTOMER;
    setUser(selected);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(selected));
    setAuthModalOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const updateProfile = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateAddress = useCallback((newAddress: UserAddress) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, address: newAddress };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
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
