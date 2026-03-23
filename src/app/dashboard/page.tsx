"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Announcement = {
  id: string;
  title: string;
  body: string;
};

type InstagramMedia = {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  media_type?: string;
  like_count?: number;
  comments_count?: number;
};

type ActivityDraw = {
  id: string;
  media_id: string;
  winners: { username?: string }[];
  created_at: string;
};

type ActivitySummary = {
  totalDraws: number;
  totalWinners: number;
  lastDraws: ActivityDraw[];
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [recentPosts, setRecentPosts] = useState<InstagramMedia[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/");
        return;
      }

      setUserEmail(data.session.user.email ?? null);

      const [annRes, credRes, profileRes] = await Promise.all([
        supabase
          .from("announcements")
          .select("id, title, body")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("user_credits")
          .select("saldo_creditos")
          .eq("user_id", data.session.user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.session.user.id)
          .maybeSingle(),
      ]);

      if (annRes.data) setAnnouncement(annRes.data as Announcement);
      setCredits(credRes.data?.saldo_creditos ?? 0);
      const name = (profileRes.data as { full_name: string | null } | null)?.full_name?.trim();
      setDisplayName(name || null);

      // Buscar posts recentes e atividade do usuário para já sugerir sorteios na tela inicial
      try {
        const [postsRes, activityRes] = await Promise.all([
          fetch("/api/instagram/media", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ userId: data.session.user.id }),
          }),
          fetch("/api/dashboard/activity", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: data.session.user.id }),
          }),
        ]);

        const postsJson = await postsRes.json();
        if (Array.isArray(postsJson.data)) {
          setRecentPosts((postsJson.data as InstagramMedia[]).slice(0, 4));
        } else if (postsJson.message) {
          setPostsError(postsJson.message as string);
        }

        if (activityRes.ok) {
          const actJson = (await activityRes.json()) as ActivitySummary;
          setActivity(actJson);
        }
      } catch (err) {
        console.error("Erro ao carregar posts/atividade no dashboard:", err);
        setPostsError("Não foi possível carregar seus posts agora.");
      }

      setLoading(false);
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-600">
        Carregando...
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 mt-4 md:mt-6 space-y-8 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/30 shadow-sm">
        <header className="border-b border-slate-200/70 pb-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Painel</p>
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl mt-1">
            Seja bem-vindo{displayName ? `, ${displayName}` : ""}!
          </h1>
          {userEmail && (
            <p className="text-sm text-slate-500 mt-1">
              {displayName ? "Logado como " : ""}
              <span className="font-medium text-slate-700">{userEmail}</span>
            </p>
          )}
        </header>

        <section className="grid gap-5 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white/65 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Créditos disponíveis
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                    {credits ?? 0}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Cada crédito = 1 sorteio. Compre mais em Comprar no menu.
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
              <div className="rounded-2xl border border-slate-200/80 bg-white/65 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Como fazer seu sorteio
                  </p>
                  <span className="rounded-full bg-gradient-to-r from-[#E1306C] to-[#F77737] px-2 py-1 text-[10px] font-semibold text-white">
                    Passo a passo
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {[
                    "Conecte Instagram",
                    "Vá em Meus posts",
                    "Selecione o post do sorteio",
                    "Defina número de ganhadores",
                    "Defina se tem palavra-chave no sorteio",
                    "Selecione se a pessoa participa só 1 vez",
                    "Clique em Carregar comentários",
                    "Clique em Realizar sorteio",
                    "Se quiser, comente automaticamente no post com o ganhador",
                  ].map((step, idx) => (
                    <div
                      key={step}
                      className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-white/85 px-2.5 py-2"
                    >
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#E1306C] via-[#F77737] to-[#FCAF45] text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <p className="text-[11px] font-medium text-slate-700">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/65 p-4">
                <p className="text-xs font-semibold text-slate-700">
                  Dica rápida de engajamento
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Use a descrição do sorteio para reforçar as regras (seguir, curtir, comentar com palavra-chave)
                  e lembre de fixar o post no topo do feed durante a campanha.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200/80 bg-white/65 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-700">
              Atividade em tempo real
            </p>
            {activity ? (
              <div className="space-y-3 text-[11px] text-slate-600">
                <p>
                  Você já realizou{" "}
                  <span className="font-semibold text-slate-800">
                    {activity.totalDraws}
                  </span>{" "}
                  sorteio(s) com{" "}
                  <span className="font-semibold text-slate-800">
                    {activity.totalWinners}
                  </span>{" "}
                  ganhador(es) ao todo.
                </p>
                {activity.lastDraws.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-700">
                      Últimos sorteios:
                    </p>
                    <ul className="space-y-1.5">
                      {activity.lastDraws.map((d) => (
                        <li
                          key={d.id}
                          className="flex flex-col rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-2"
                        >
                          <span className="text-[10px] text-slate-500">
                            {new Date(d.created_at).toLocaleString("pt-BR")}
                          </span>
                          <span className="text-[11px] text-slate-700">
                            Post ID:{" "}
                            <span className="font-mono text-[10px]">
                              {d.media_id}
                            </span>
                          </span>
                          {Array.isArray(d.winners) && d.winners.length > 0 && (
                            <span className="text-[11px] text-slate-600">
                              Ganhador(es):{" "}
                              {d.winners
                                .map((w) =>
                                  w?.username ? `@${w.username}` : "@?",
                                )
                                .join(", ")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-600">
                Assim que você realizar seus primeiros sorteios, eles aparecem
                aqui com data e ganhadores.
              </p>
            )}
          </aside>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Próximos sorteios
              </p>
              <h2 className="text-sm font-semibold text-slate-900">
                Escolha um post para sortear
              </h2>
            </div>
            <Link
              href="/meus-posts"
              className="hidden sm:inline-flex items-center rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver todos os posts
            </Link>
          </div>

          {postsError && recentPosts.length === 0 ? (
            <p className="text-xs text-slate-500">{postsError}</p>
          ) : recentPosts.length === 0 ? (
            <p className="text-xs text-slate-500">
              Assim que você conectar seu Instagram e tivermos posts, eles aparecem aqui para você sortear em um clique.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {recentPosts.map((post) => {
                const isVideo = post.media_type && post.media_type !== "IMAGE";
                const img = isVideo ? (post.thumbnail_url || post.media_url) : (post.media_url || post.thumbnail_url);
                const params = new URLSearchParams();
                if (img) params.set("media_url", img);
                if (post.thumbnail_url && isVideo) params.set("thumbnail_url", post.thumbnail_url);
                if (post.media_type) params.set("media_type", post.media_type);
                if (post.caption) params.set("caption", post.caption);
                if (post.like_count != null) params.set("likes", String(post.like_count));
                if (post.comments_count != null) params.set("comments", String(post.comments_count));
                const qs = params.toString();
                const href = `/sorteio/${post.id}${qs ? `?${qs}` : ""}`;
                return (
                  <Link
                    key={post.id}
                    href={href}
                    className="group rounded-2xl overflow-hidden border border-slate-200/80 bg-white/80 shadow-sm hover:shadow-md transition"
                  >
                    <div className="relative aspect-square bg-slate-100">
                      {img ? (
                        <img
                          src={img}
                          alt={post.caption ?? "Post do Instagram"}
                          className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03] transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-500">
                          Post
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px]">
                        <span className="line-clamp-1 text-white drop-shadow">
                          {post.caption || "Sem legenda"}
                        </span>
                        <span className="rounded-full bg-white/95 text-slate-800 px-2 py-0.5 font-semibold uppercase tracking-wide">
                          Sortear
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

