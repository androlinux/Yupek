"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getOAuthRedirectUrl } from "@/lib/authEnv";

export interface UserAddress {
  id?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  street: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: "customer" | "admin";
  provider: "google" | "email";
  address?: UserAddress;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: "signin" | "signup";
  setAuthModalTab: (tab: "signin" | "signup") => void;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    firstName: string,
    lastName: string,
    phone?: string
  ) => Promise<{ success: boolean; error?: string; confirmationNeeded?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (data: { firstName: string; lastName: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_STORAGE_KEY = "yupek_client_auth_v3";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");

  // Sync profile details from public.profiles table or user metadata
  const loadProfile = useCallback(async (userId: string, email: string, metadata: any, provider: "google" | "email", createdAt?: string) => {
    let firstName = metadata?.first_name || "";
    let lastName = metadata?.last_name || "";
    let phone = metadata?.phone || "";

    if (!firstName && metadata?.full_name) {
      const parts = metadata.full_name.split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    } else if (!firstName && metadata?.name) {
      const parts = metadata.name.split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }

    // Attempt to read from public.profiles
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        if (profile.first_name) firstName = profile.first_name;
        if (profile.last_name) lastName = profile.last_name;
        if (profile.phone) phone = profile.phone;
      }
    } catch {
      // profiles table might be pending migration
    }

    // Attempt to load default address
    let defaultAddress: UserAddress | undefined;
    try {
      const { data: addr } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (addr) {
        defaultAddress = {
          id: addr.id,
          fullName: `${addr.first_name} ${addr.last_name}`.trim(),
          firstName: addr.first_name,
          lastName: addr.last_name,
          street: addr.address1,
          address2: addr.address2,
          city: addr.city,
          postalCode: addr.postal_code,
          country: addr.country,
          phone: addr.phone || phone,
          isDefault: addr.is_default,
        };
      }
    } catch {
      // ignore
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0] || "Valued Client";

    const authUser: AuthUser = {
      id: userId,
      email,
      firstName,
      lastName,
      name: fullName,
      phone,
      role: metadata?.role === "admin" ? "admin" : "customer",
      provider,
      address: defaultAddress || {
        fullName,
        firstName,
        lastName,
        street: "",
        city: "",
        postalCode: "",
        country: "Netherlands",
        phone,
      },
      createdAt: createdAt || new Date().toISOString(),
    };

    setUser(authUser);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
    } catch {}

    return authUser;
  }, []);

  // Initialize session from Supabase
  useEffect(() => {
    // 1. Instant restore from localStorage cache for fluid UI
    try {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch {}

    // 2. Fetch authoritative Supabase session
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const supa = session.user;
          const provider = (supa.app_metadata?.provider || "email") as "google" | "email";
          await loadProfile(supa.id, supa.email || "", supa.user_metadata, provider, supa.created_at);
        } else {
          setUser(null);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch (err) {
        console.warn("[Auth Init Error]", err);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    // 3. Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const supa = session.user;
        const provider = (supa.app_metadata?.provider || "email") as "google" | "email";
        await loadProfile(supa.id, supa.email || "", supa.user_metadata, provider, supa.created_at);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Refresh profile manually
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const supa = session.user;
      const provider = (supa.app_metadata?.provider || "email") as "google" | "email";
      await loadProfile(supa.id, supa.email || "", supa.user_metadata, provider, supa.created_at);
    }
  }, [loadProfile]);

  // Sign In with Supabase Auth
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      const cleanEmail = email.trim();
      const cleanPass = pass.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Invalid email or password. Please verify your credentials.",
        };
      }

      if (data.user) {
        await loadProfile(
          data.user.id,
          data.user.email || cleanEmail,
          data.user.user_metadata,
          "email",
          data.user.created_at
        );
        setAuthModalOpen(false);
        return { success: true };
      }

      return { success: false, error: "Unable to sign in. Please try again." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection error. Please try again.";
      return { success: false, error: msg };
    }
  }, [loadProfile]);

  // Sign Up with Supabase Auth and create public.profiles entry
  const signUpWithEmail = useCallback(
    async (
      email: string,
      pass: string,
      firstName: string,
      lastName: string,
      phone?: string
    ) => {
      try {
        const cleanEmail = email.trim();
        const cleanPass = pass.trim();
        const cleanFirst = firstName.trim();
        const cleanLast = lastName.trim();
        const cleanPhone = phone ? phone.trim() : "";

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: {
            data: {
              first_name: cleanFirst,
              last_name: cleanLast,
              full_name: `${cleanFirst} ${cleanLast}`.trim(),
              phone: cleanPhone,
            },
          },
        });

        if (error) {
          return {
            success: false,
            error: error.message || "Registration failed. Please check your information.",
          };
        }

        if (data.user) {
          // Explicitly upsert to public.profiles for instant consistency
          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              first_name: cleanFirst,
              last_name: cleanLast,
              phone: cleanPhone,
              updated_at: new Date().toISOString(),
            });
          } catch {
            // Profile trigger handles fallback
          }

          // Check if session was granted immediately (email confirmation disabled)
          if (data.session) {
            await loadProfile(
              data.user.id,
              cleanEmail,
              { first_name: cleanFirst, last_name: cleanLast, phone: cleanPhone },
              "email",
              data.user.created_at
            );
            setAuthModalOpen(false);
            return { success: true };
          }

          // Email confirmation is required by Supabase project settings
          return {
            success: true,
            confirmationNeeded: true,
          };
        }

        return { success: false, error: "Registration failed. Please try again." };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Registration error. Please try again.";
        return { success: false, error: msg };
      }
    },
    [loadProfile]
  );

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectTo = getOAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.url) {
        window.location.href = data.url;
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google OAuth error";
      return { success: false, error: msg };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {}
  }, []);

  // Update profile in public.profiles and local state
  const updateProfile = useCallback(
    async (updates: { firstName: string; lastName: string; phone?: string }) => {
      if (!user) return { success: false, error: "Not authenticated" };

      const cleanFirst = updates.firstName.trim();
      const cleanLast = updates.lastName.trim();
      const cleanPhone = (updates.phone || "").trim();

      try {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          first_name: cleanFirst,
          last_name: cleanLast,
          phone: cleanPhone,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          return { success: false, error: error.message };
        }

        // Also update Supabase auth metadata
        try {
          await supabase.auth.updateUser({
            data: {
              first_name: cleanFirst,
              last_name: cleanLast,
              full_name: `${cleanFirst} ${cleanLast}`.trim(),
              phone: cleanPhone,
            },
          });
        } catch {}

        const fullName = `${cleanFirst} ${cleanLast}`.trim() || user.email;
        const updated: AuthUser = {
          ...user,
          firstName: cleanFirst,
          lastName: cleanLast,
          name: fullName,
          phone: cleanPhone,
        };

        setUser(updated);
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
        } catch {}

        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update profile";
        return { success: false, error: msg };
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authModalOpen,
        setAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        refreshProfile,
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
