"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPrintifyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/promio");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 border-2 border-brown/30 border-t-brown rounded-full animate-spin mx-auto" />
        <p className="font-serif text-lg text-brown">Redirecting to Promio API Synchronizer...</p>
        <p className="text-xs text-brown/60">YUPEK fulfillment is powered exclusively by Promio (Breda, NL).</p>
      </div>
    </div>
  );
}
