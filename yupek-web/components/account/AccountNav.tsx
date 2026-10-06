"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { useStore } from "@/components/Providers";
import { useLanguage } from "@/components/LanguageContext";

export default function AccountNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { wishlist } = useStore();
  const { t, locale } = useLanguage();

  const links = [
    { href: "/account", label: locale === "nl" ? "Mijn Profiel" : "Profile", exact: true },
    { href: "/account/orders", label: locale === "nl" ? "Bestellingen" : "Orders" },
    { href: "/account/addresses", label: locale === "nl" ? "Adressen" : "Addresses" },
    { href: "/account/security", label: locale === "nl" ? "Beveiliging" : "Security" },
    { href: "/wishlist", label: `${locale === "nl" ? "Verlanglijst" : "Wishlist"} (${wishlist.length})` },
  ];

  return (
    <div>
      {/* User Header Card */}
      <div className="border border-brown/15 bg-sand/20 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brown text-lg font-serif text-cream shadow-md shrink-0">
            {(user?.firstName || user?.name || "C").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl md:text-3xl text-brown tracking-wider">
                {user?.name || user?.email}
              </h1>
              <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-brown font-semibold">
                {user?.role === "admin" ? t.account.adminMemberTag : t.account.vipMemberTag}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-brown/70">{user?.email}</p>
            {user?.phone && <p className="text-[11px] text-brown/60">{user.phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => signOut()}
            className="border border-brown/30 px-4 py-2 text-xs uppercase tracking-widest text-brown hover:bg-brown hover:text-cream transition-colors"
          >
            {t.account.signOutBtn}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <nav aria-label="Account navigation" className="mt-6 flex border-b border-brown/15 overflow-x-auto text-xs uppercase tracking-widest scrollbar-none">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "border-brown text-brown font-semibold bg-sand/20"
                  : "border-transparent text-brown/60 hover:text-brown hover:bg-sand/10"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
