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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Carregando...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400/80">
              Painel
            </p>
            <h1 className="text-2xl font-semibold md:text-3xl">
              Bem-vindo ao{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FEDA77] via-[#F56040] to-[#D62976]">
                Sowish Sorteios
              </span>
            </h1>
            {userEmail && (
              <p className="text-sm text-slate-400 mt-1">
                Logado como <span className="font-medium">{userEmail}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleConnectInstagram}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FEDA77] via-[#F56040] to-[#D62976] px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-[#D62976]/40 transition hover:brightness-110"
            >
              <span className="h-2 w-2 rounded-full bg-[#F77737]" />
              Conectar meu Instagram
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-white/15 bg-slate-950/80 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900/80 transition"
            >
              Sair
            </button>
          </div>
        </header>

        {announcement && (
          <div className="rounded-2xl border border-[#F56040]/50 bg-[#F56040]/15 p-4 text-xs text-slate-50">
            <p className="font-semibold mb-1">{announcement.title}</p>
            <p className="text-slate-100/90 whitespace-pre-line">
              {announcement.body}
            </p>
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-[#D62976]/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Créditos disponíveis
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight">
                    0
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Em breve você poderá comprar pacotes via Pix direto do
                    painel.
                  </p>
                </div>
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-[#FEDA77] via-[#F56040] to-[#D62976] p-[2px] shadow-lg">
                  <div className="h-full w-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-[10px] text-slate-200">
                    <span className="text-xs font-semibold">Sorteios</span>
                    <span className="text-[9px] text-slate-400">créditos</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <p className="text-xs font-semibold text-slate-200">
                  Comece em 3 passos
                </p>
                <ol className="mt-3 space-y-2 text-xs text-slate-300">
                  <li>1. Conecte o Instagram oficial da campanha.</li>
                  <li>2. Escolha o post na aba “Meus posts”.</li>
                  <li>3. Defina regras e rode o sorteio com 1 clique.</li>
                </ol>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <p className="text-xs font-semibold text-slate-200">
                  Status da conta
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  Conta ativa. Em breve você verá aqui histórico de sorteios,
                  notas fiscais de créditos e integrações adicionais.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-200">
              Atividade em tempo real
            </p>
            <div className="space-y-3 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FEDA77]" />
                <span>
                  Em breve: últimos sorteios realizados e vencedores exibidos
                  aqui.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F56040]" />
                <span>
                  Acompanhe métricas de comentários, engajamento e taxa de
                  conversão.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D62976]" />
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

