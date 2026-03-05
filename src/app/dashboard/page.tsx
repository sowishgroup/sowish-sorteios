"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Announcement = {
  id: string;
  title: string;
  body: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/");
        return;
      }

      setUserEmail(data.session.user.email ?? null);

      const { data: ann } = await supabase
        .from("announcements")
        .select("id, title, body")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ann) setAnnouncement(ann as Announcement);

      setLoading(false);
    };

    checkSession();
  }, [router]);

  const handleConnectInstagram = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.push("/");
      return;
    }

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    // Usa sempre o domínio atual (produção ou localhost), assim não depende do valor no build
    const redirectUri =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/meta/callback`
        : (process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI ?? "");

    if (!appId || !redirectUri) {
      alert(
        "Configuração do Facebook App não encontrada. Verifique NEXT_PUBLIC_FACEBOOK_APP_ID."
      );
      return;
    }

    const scope = [
      "instagram_basic",
      "instagram_manage_comments",
      "pages_show_list",
    ].join(",");

    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(
      appId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(
      scope
    )}&response_type=code&state=${encodeURIComponent(user.id)}`;

    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-600">
        Carregando...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Painel
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
              Bem-vindo ao{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E1306C] via-[#F77737] to-[#FCAF45]">
                Sowish Sorteios
              </span>
            </h1>
            {userEmail && (
              <p className="text-sm text-slate-500 mt-1">
                Logado como <span className="font-medium text-slate-700">{userEmail}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/meus-posts")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Meus posts
            </button>
            <button
              onClick={handleConnectInstagram}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E1306C] to-[#F77737] px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
            >
              <span className="h-2 w-2 rounded-full bg-white/90" />
              Conectar meu Instagram
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
            >
              Sair
            </button>
          </div>
        </header>

        {announcement && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-slate-800">
            <p className="font-semibold mb-1">{announcement.title}</p>
            <p className="text-slate-600 whitespace-pre-line">
              {announcement.body}
            </p>
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Créditos disponíveis
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                    0
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Em breve você poderá comprar pacotes via Pix direto do
                    painel.
                  </p>
                </div>
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-[#E1306C] to-[#FCAF45] p-[2px] shadow-md">
                  <div className="h-full w-full rounded-full bg-white flex flex-col items-center justify-center text-[10px] text-slate-600">
                    <span className="text-xs font-semibold">Sorteios</span>
                    <span className="text-[9px] text-slate-400">créditos</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold text-slate-700">
                  Comece em 3 passos
                </p>
                <ol className="mt-3 space-y-2 text-xs text-slate-600">
                  <li>1. Conecte o Instagram oficial da campanha.</li>
                  <li>2. Escolha o post na aba “Meus posts”.</li>
                  <li>3. Defina regras e rode o sorteio com 1 clique.</li>
                </ol>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold text-slate-700">
                  Status da conta
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Conta ativa. Em breve você verá aqui histórico de sorteios,
                  notas fiscais de créditos e integrações adicionais.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-700">
              Atividade em tempo real
            </p>
            <div className="space-y-3 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E1306C]" />
                <span>
                  Em breve: últimos sorteios realizados e vencedores exibidos
                  aqui.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F77737]" />
                <span>
                  Acompanhe métricas de comentários, engajamento e taxa de
                  conversão.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FCAF45]" />
                <span>
                  Planeje futuros sorteios alinhados com calendário da sua
                  marca.
                </span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

