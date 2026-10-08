"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfigProvider } from "./ConfigContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";
import AuthModal from "./AuthModal";

export type CartLine = { 
  slug: string; 
  size: string; 
  color: string; 
  qty: number;
  productId?: string;
  printifyProductId?: string;
  printifyVariantId?: string;
  title?: string;
  price?: number;
  price_cents?: number;
  image?: string;
};
type Ctx = {
  lines: CartLine[]; count: number; wishlist: string[];
  add: (l: Omit<CartLine, "qty">, openDrawer?: boolean) => void; remove: (l: Omit<CartLine, "qty">) => void; setQty: (l: Omit<CartLine, "qty">, qty: number) => void;
  clearCart: () => void;
  toggleWish: (slug: string) => void;
  cartOpen: boolean; setCartOpen: (v: boolean) => void; searchOpen: boolean; setSearchOpen: (v: boolean) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void;
};
const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside Providers");
  return c;
};
const same = (a: Omit<CartLine, "qty">, b: Omit<CartLine, "qty">) => a.slug === b.slug && a.size === b.size && a.color === b.color;

function StoreProviderInner({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { user } = useAuth();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    try {
      setLines(JSON.parse(localStorage.getItem("yupek-cart") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("yupek-wishlist") || "[]"));
    } catch { /* corrupted storage: start empty */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("yupek-cart", JSON.stringify(lines)); }, [lines, ready]);
  useEffect(() => { if (ready) localStorage.setItem("yupek-wishlist", JSON.stringify(wishlist)); }, [wishlist, ready]);

  // Clear wishlist from client cache on logout or switching accounts to prevent data leakage
  useEffect(() => {
    if (!ready) return;
    if (previousUserIdRef.current === undefined) {
      previousUserIdRef.current = user?.id || null;
      return;
    }

    if (previousUserIdRef.current && (!user?.id || user.id !== previousUserIdRef.current)) {
      setWishlist([]);
      try {
        localStorage.removeItem("yupek-wishlist");
      } catch {}
    }

    previousUserIdRef.current = user?.id || null;
  }, [user?.id, ready]);

  // Wishlist sync with Supabase when authenticated
  useEffect(() => {
    if (!user?.id || !ready) return;
    const currentUserId = user.id;

    async function syncWishlist() {
      try {
        const { data } = await supabase
          .from("wishlists")
          .select("product_id")
          .eq("user_id", currentUserId);

        const dbSlugs = (data || []).map((row: any) => row.product_id);
        const localSlugs = JSON.parse(localStorage.getItem("yupek-wishlist") || "[]") as string[];

        // Merge guest wishlist into database
        const missingInDb = localSlugs.filter((s) => !dbSlugs.includes(s));
        if (missingInDb.length > 0) {
          const toInsert = missingInDb.map((s) => ({
            user_id: currentUserId,
            product_id: s,
          }));
          await supabase.from("wishlists").upsert(toInsert, { onConflict: "user_id,product_id" });
        }

        const combined = Array.from(new Set([...dbSlugs, ...localSlugs]));
        setWishlist(combined);
        localStorage.setItem("yupek-wishlist", JSON.stringify(combined));
      } catch {
        // wishlists table pending migration
      }
    }

    syncWishlist();
  }, [user?.id, ready]);

  const add = useCallback((l: Omit<CartLine, "qty">, openDrawer = true) => {
    setLines((p) => (p.some((x) => same(x, l)) ? p.map((x) => (same(x, l) ? { ...x, qty: Math.min(10, x.qty + 1) } : x)) : [...p, { ...l, qty: 1 }]));
    if (openDrawer) { setCartOpen(true); setMenuOpen(false); }
  }, []);
  const remove = useCallback((l: Omit<CartLine, "qty">) => setLines((p) => p.filter((x) => !same(x, l))), []);
  const setQty = useCallback((l: Omit<CartLine, "qty">, qty: number) => setLines((p) => (qty < 1 ? p.filter((x) => !same(x, l)) : p.map((x) => (same(x, l) ? { ...x, qty: Math.min(10, qty) } : x)))), []);
  const clearCart = useCallback(() => setLines([]), []);
  const toggleWish = useCallback(
    async (slug: string) => {
      const willAdd = !wishlist.includes(slug);
      setWishlist((p) => (willAdd ? [...p, slug] : p.filter((s) => s !== slug)));

      if (user?.id) {
        try {
          if (willAdd) {
            await supabase
              .from("wishlists")
              .upsert({ user_id: user.id, product_id: slug }, { onConflict: "user_id,product_id" });
          } else {
            await supabase
              .from("wishlists")
              .delete()
              .eq("user_id", user.id)
              .eq("product_id", slug);
          }
        } catch {
          // ignore
        }
      }
    },
    [user?.id, wishlist]
  );

  // Wrap setters so opening one panel closes others (mutual exclusion)
  const openCart = useCallback((v: boolean) => { setCartOpen(v); if (v) { setMenuOpen(false); setSearchOpen(false); } }, []);
  const openSearch = useCallback((v: boolean) => { setSearchOpen(v); if (v) { setMenuOpen(false); setCartOpen(false); } }, []);
  const openMenu = useCallback((v: boolean) => { setMenuOpen(v); if (v) { setCartOpen(false); setSearchOpen(false); } }, []);

  const value = useMemo(() => ({ lines, count: lines.reduce((n, l) => n + l.qty, 0), wishlist, add, remove, setQty, clearCart, toggleWish, cartOpen, setCartOpen: openCart, searchOpen, setSearchOpen: openSearch, menuOpen, setMenuOpen: openMenu }),
    [lines, wishlist, add, remove, setQty, clearCart, toggleWish, cartOpen, openCart, searchOpen, openSearch, menuOpen, openMenu]);

  return (
    <StoreCtx.Provider value={value}>
      {children}
      <AuthModal />
      <AccessibilityWidgets />
      <AdminHotkey />
      <CookieBanner />
      <CookieSettingsModal />
    </StoreCtx.Provider>
  );
}

import AdminHotkey from "./AdminHotkey";
import { LanguageProvider } from "./LanguageContext";
import { AccessibilityProvider } from "./AccessibilityContext";
import AccessibilityWidgets from "./AccessibilityWidgets";
import { CookieConsentProvider } from "./CookieConsentContext";
import CookieBanner from "./CookieBanner";
import CookieSettingsModal from "./CookieSettingsModal";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <CookieConsentProvider>
          <ConfigProvider>
            <AuthProvider>
              <StoreProviderInner>
                {children}
              </StoreProviderInner>
            </AuthProvider>
          </ConfigProvider>
        </CookieConsentProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
