"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-white/60 hover:text-white px-3 min-h-[44px] rounded-xl active:scale-95 transition-all"
    >
      <LogOut size={16} />
      <span className="text-sm font-medium">Logout</span>
    </button>
  );
}
