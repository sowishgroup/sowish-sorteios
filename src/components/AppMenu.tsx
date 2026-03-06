"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const APP_ROUTES = ["/dashboard", "/meus-posts", "/conta", "/comprar", "/ultimos-sorteios"];
const SORTEIO_PREFIX = "/sorteio/";

function isAppRoute(pathname: string): boolean {
  if (pathname.startsWith(SORTEIO_PREFIX)) return true;
  return APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export default function AppMenu({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s as any);
      if (!s?.user) {
        setLoading(false);
        return;
      }
      const [prof, cred, ig] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", s.user.id).maybeSingle(),
        supabase.from("user_credits").select("saldo_creditos").eq("user_id", s.user.id).maybeSingle(),
        supabase.from("user_instagram_accounts").select("user_id").eq("user_id", s.user.id).maybeSingle(),
      ]);
      setProfile(prof.data ?? null);
      setCredits(cred.data?.saldo_creditos ?? 0);
      setInstagramConnected(!!ig.data);
      setLoading(false);
    };
    load();
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!session?.user && pathname !== "/" && !pathname.startsWith("/admin")) {
      router.replace("/");
      return;
    }
  }, [loading, session, pathname, router]);

  const showMenu = session?.user && (pathname === "/" ? false : pathname.startsWith("/admin") ? false : true);

  const handleConnectInstagram = async () => {
    if (!session?.user) return;
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/api/meta/callback` : "";
    if (!appId || !redirectUri) {
      alert("Configuração do Facebook não encontrada.");
      return;
    }
    const scope = ["instagram_basic", "instagram_manage_comments", "pages_show_list", "pages_read_engagement"].join(",");
    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${encodeURIComponent(session.user.id)}`;
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!showMenu) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Sowish" width={36} height={36} className="object-contain" />
            <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#E1306C] to-[#F77737]">
              Sowish Sorteios
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Link
              href="/conta"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Meus dados
            </Link>
            <Link
              href="/ultimos-sorteios"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Últimos sorteios
            </Link>
            {instagramConnected ? (
              <Link
                href="/meus-posts"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Conectado
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleConnectInstagram}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#E1306C] to-[#F77737] hover:brightness-110"
              >
                Conectar Instagram
              </button>
            )}
            <span className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100">
              {credits ?? 0} créditos
            </span>
            <Link
              href="/comprar"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#E1306C] hover:bg-pink-50"
            >
              Comprar
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
