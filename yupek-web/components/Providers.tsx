"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConfigProvider } from "./ConfigContext";
import { AuthProvider } from "./AuthContext";
import AuthModal from "./AuthModal";
import WhatsAppButton from "./WhatsAppButton";

export type CartLine = { slug: string; size: string; color: string; qty: number };
type Ctx = {
  lines: CartLine[]; count: number; wishlist: string[];
  add: (l: Omit<CartLine, "qty">, openDrawer?: boolean) => void; remove: (l: Omit<CartLine, "qty">) => void; setQty: (l: Omit<CartLine, "qty">, qty: number) => void;
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

  useEffect(() => {
    try {
      setLines(JSON.parse(localStorage.getItem("yupek-cart") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("yupek-wishlist") || "[]"));
    } catch { /* corrupted storage: start empty */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("yupek-cart", JSON.stringify(lines)); }, [lines, ready]);
  useEffect(() => { if (ready) localStorage.setItem("yupek-wishlist", JSON.stringify(wishlist)); }, [wishlist, ready]);

  const add = useCallback((l: Omit<CartLine, "qty">, openDrawer = true) => {
    setLines((p) => (p.some((x) => same(x, l)) ? p.map((x) => (same(x, l) ? { ...x, qty: Math.min(10, x.qty + 1) } : x)) : [...p, { ...l, qty: 1 }]));
    if (openDrawer) { setCartOpen(true); setMenuOpen(false); }
  }, []);
  const remove = useCallback((l: Omit<CartLine, "qty">) => setLines((p) => p.filter((x) => !same(x, l))), []);
  const setQty = useCallback((l: Omit<CartLine, "qty">, qty: number) => setLines((p) => (qty < 1 ? p.filter((x) => !same(x, l)) : p.map((x) => (same(x, l) ? { ...x, qty: Math.min(10, qty) } : x)))), []);
  const toggleWish = useCallback((slug: string) => setWishlist((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug])), []);

  // Wrap setters so opening one panel closes others (mutual exclusion)
  const openCart = useCallback((v: boolean) => { setCartOpen(v); if (v) { setMenuOpen(false); setSearchOpen(false); } }, []);
  const openSearch = useCallback((v: boolean) => { setSearchOpen(v); if (v) { setMenuOpen(false); setCartOpen(false); } }, []);
  const openMenu = useCallback((v: boolean) => { setMenuOpen(v); if (v) { setCartOpen(false); setSearchOpen(false); } }, []);

  const value = useMemo(() => ({ lines, count: lines.reduce((n, l) => n + l.qty, 0), wishlist, add, remove, setQty, toggleWish, cartOpen, setCartOpen: openCart, searchOpen, setSearchOpen: openSearch, menuOpen, setMenuOpen: openMenu }),
    [lines, wishlist, add, remove, setQty, toggleWish, cartOpen, openCart, searchOpen, openSearch, menuOpen, openMenu]);

  return (
    <StoreCtx.Provider value={value}>
      {children}
      <AuthModal />
      <WhatsAppButton />
      <AccessibilityWidgets />
    </StoreCtx.Provider>
  );
}

import { LanguageProvider } from "./LanguageContext";
import { AccessibilityProvider } from "./AccessibilityContext";
import AccessibilityWidgets from "./AccessibilityWidgets";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <ConfigProvider>
          <AuthProvider>
            <StoreProviderInner>
              {children}
            </StoreProviderInner>
          </AuthProvider>
        </ConfigProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
