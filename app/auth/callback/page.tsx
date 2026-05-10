"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) { router.replace("/"); return; }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) console.error("[auth/callback]", error.message);
      router.replace("/");
    });
  }, [router]);

  return null;
}
