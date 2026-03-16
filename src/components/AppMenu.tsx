"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const APP_ROUTES = [
  "/dashboard",
  "/meus-posts",
  "/conta",
  "/comprar",
  "/ultimos-sorteios",
  "/avisos",
  "/admin",
];
const SORTEIO_PREFIX = "/sorteio/";

function isAppRoute(pathname: string): boolean {
  if (pathname.startsWith(SORTEIO_PREFIX)) return true;
  return APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

type ProfileInfo = {
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export default function AppMenu({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasAnnouncement, setHasAnnouncement] = useState(false);
  const [latestAnnouncementId, setLatestAnnouncementId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s as any);
      if (!s?.user) {
        setLoading(false);
        return;
      }
      const [prof, cred, ig] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, role").eq("id", s.user.id).maybeSingle(),
        supabase.from("user_credits").select("saldo_creditos").eq("user_id", s.user.id).maybeSingle(),
        supabase.from("user_instagram_accounts").select("user_id").eq("user_id", s.user.id).maybeSingle(),
      ]);
      setProfile(prof.data ?? null);
      setCredits(cred.data?.saldo_creditos ?? 0);
      setInstagramConnected(!!ig.data);

      const { data: ann } = await supabase
        .from("announcements")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      let hasNew = false;
      if (typeof window !== "undefined" && ann && ann.length > 0) {
        const latest = String(ann[0].id);
        setLatestAnnouncementId(latest);
        const seen = window.localStorage.getItem("sowish_last_seen_announcement_id");
        hasNew = !seen || seen !== latest;
      }
      setHasAnnouncement(hasNew);
      setLoading(false);
    };
    load();
  }, [pathname]);

  useEffect(() => {
    // Fecha o menu mobile ao trocar de página
    setMobileOpen(false);
  }, [pathname]);

  const showMenu = session?.user && isAppRoute(pathname);

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

  const handleOpenNotifications = () => {
    if (latestAnnouncementId && typeof window !== "undefined") {
      window.localStorage.setItem("sowish_last_seen_announcement_id", latestAnnouncementId);
    }
    setHasAnnouncement(false);
    router.push("/avisos");
  };

  const handleDisconnectInstagram = async () => {
    if (!session?.user || !window.confirm("Desconectar sua conta do Instagram? Você precisará conectar novamente para realizar sorteios.")) return;
    setDisconnecting(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const token = s?.access_token;
      if (!token) throw new Error("Sessão inválida");
      const res = await fetch("/api/instagram/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao desconectar");
      setInstagramConnected(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Erro ao desconectar Instagram.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSupportWhats = () => {
    const base = "https://wa.me/554733041326";
    const text = "Olá, preciso de ajuda com o Sowish Sorteios.";
    const url = `${base}?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  if (!showMenu) return <>{children}</>;

  return (
    <div className="min-h-screen text-slate-900 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-20 items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Sowish" width={220} height={220} className="h-20 w-20 object-contain" />
            <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#E1306C] to-[#F77737]">
              Sowish Sorteios
            </span>
          </Link>
          {/* Navegação desktop */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Dashboard
            </Link>
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
            <Link
              href="/meus-posts"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Meus posts
            </Link>
            {instagramConnected ? (
              <div className="inline-flex items-center gap-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Conectado
                </span>
                <button
                  type="button"
                  onClick={handleDisconnectInstagram}
                  disabled={disconnecting}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  title="Desconectar Instagram"
                >
                  {disconnecting ? "..." : "Desconectar"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectInstagram}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#E1306C] to-[#F77737] hover:brightness-110"
              >
                Conectar Instagram
              </button>
            )}
            <button
              type="button"
              onClick={handleSupportWhats}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            >
              Suporte
            </button>
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Avisos e novidades"
            >
              <span className="sr-only">Avisos e novidades</span>
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="h-4 w-4 rounded-full border border-slate-500" />
                <span className="absolute -top-1 h-1.5 w-3 rounded-t-full border-t border-slate-500" />
              </span>
              {hasAnnouncement && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#E1306C]" />
              )}
            </button>
            <span className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100">
              {credits ?? 0} créditos
            </span>
            <Link
              href="/comprar"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#E1306C] hover:bg-pink-50"
            >
              Comprar
            </Link>
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sair
            </button>
          </nav>
          {/* Botão mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white/80 px-2.5 py-2 text-slate-700"
            aria-label="Abrir menu"
          >
            <span className="sr-only">Abrir menu</span>
            <span className="flex flex-col gap-0.5">
              <span className="h-0.5 w-4 rounded bg-slate-700" />
              <span className="h-0.5 w-4 rounded bg-slate-700" />
              <span className="h-0.5 w-4 rounded bg-slate-700" />
            </span>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur px-4 py-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700">
                Créditos: <span className="font-semibold">{credits ?? 0}</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Sair
              </button>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <Link
                href="/conta"
                className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                Meus dados
              </Link>
              <Link
                href="/ultimos-sorteios"
                className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                Últimos sorteios
              </Link>
              <Link
                href="/meus-posts"
                className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                Meus posts
              </Link>
              {instagramConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectInstagram}
                  disabled={disconnecting}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {disconnecting ? "Desconectando..." : "Desconectar Instagram"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectInstagram}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#E1306C] to-[#F77737] hover:brightness-110"
                >
                  Conectar Instagram
                </button>
              )}
              <Link
                href="/comprar"
                className="rounded-lg px-3 py-2 text-[#E1306C] hover:bg-pink-50"
              >
                Comprar créditos
              </Link>
              <button
                type="button"
                onClick={handleSupportWhats}
                className="rounded-lg px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs"
              >
                Suporte (WhatsApp)
              </button>
              <button
                type="button"
                onClick={handleOpenNotifications}
                className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-xs"
              >
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="h-3 w-3 rounded-full border border-slate-500" />
                  <span className="absolute -top-1 h-1 w-2 rounded-t-full border-t border-slate-500" />
                  {hasAnnouncement && (
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#E1306C]" />
                  )}
                </span>
                Avisos
              </button>
              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
