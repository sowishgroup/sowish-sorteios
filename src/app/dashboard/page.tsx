\"use client\";

import { useEffect, useState } from \"react\";
import Link from \"next/link\";
import { useRouter } from \"next/navigation\";
import { supabase } from \"@/lib/supabaseClient\";

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
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [recentPosts, setRecentPosts] = useState<InstagramMedia[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace(\"/\");
        return;
      }

      setUserEmail(data.session.user.email ?? null);

      const [annRes, credRes, profileRes] = await Promise.all([
        supabase
          .from(\"announcements\")
          .select(\"id, title, body\")
          .eq(\"is_active\", true)
          .order(\"created_at\", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from(\"user_credits\")
          .select(\"saldo_creditos\")
          .eq(\"user_id\", data.session.user.id)
          .maybeSingle(),
        supabase
          .from(\"profiles\")
          .select(\"full_name\")
          .eq(\"id\", data.session.user.id)
          .maybeSingle(),
      ]);

      if (annRes.data) setAnnouncement(annRes.data as Announcement);
      setCredits(credRes.data?.saldo_creditos ?? 0);
      const name = (profileRes.data as { full_name: string | null } | null)?.full_name?.trim();
      setDisplayName(name || null);

      // Buscar posts recentes para já sugerir sorteios na tela inicial
      try {
        const res = await fetch(\"/api/instagram/media\", {
          method: \"POST\",
          headers: {
            \"Content-Type\": \"application/json\",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ userId: data.session.user.id }),
        });
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setRecentPosts((json.data as InstagramMedia[]).slice(0, 4));
        } else if (json.message) {
          setPostsError(json.message as string);
        }
      } catch (err) {
        console.error(\"Erro ao carregar posts recentes no dashboard:\", err);
        setPostsError(\"Não foi possível carregar seus posts agora.\");
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

        {announcement && (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-xs text-slate-800">
            <p className="font-semibold mb-1">{announcement.title}</p>
            <p className="text-slate-600 whitespace-pre-line">
              {announcement.body}
            </p>
          </div>
        )}

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
                <p className="text-xs font-semibold text-slate-700">
                  Como fazer seu sorteio
                </p>
                <ol className="mt-3 space-y-2 text-xs text-slate-600">
                  <li>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E1306C] text-[10px] font-bold text-white mr-1">
                      1
                    </span>
                    Conecte o Instagram oficial da campanha no topo da tela.
                  </li>
                  <li>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F77737] text-[10px] font-bold text-white mr-1">
                      2
                    </span>
                    Vá em <span className="font-semibold">Meus posts</span> e escolha o post do sorteio.
                  </li>
                  <li>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FCAF45] text-[10px] font-bold text-white mr-1">
                      3
                    </span>
                    Defina palavra-chave, número de ganhadores e clique em{" "}
                    <span className="font-semibold">Realizar Sorteio</span>.
                  </li>
                  <li>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white mr-1">
                      4
                    </span>
                    Compartilhe o resultado no WhatsApp ou baixe a imagem em formato story.
                  </li>
                </ol>
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
                const img = post.thumbnail_url || post.media_url;
                const href = `/sorteio/${post.id}`;
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
                          alt={post.caption ?? \"Post do Instagram\"}
                          className=\"absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03] transition-transform\"
                          loading=\"lazy\"
                        />
                      ) : (
                        <div className=\"absolute inset-0 flex items-center justify-center text-[11px] text-slate-500\">
                          Post
                        </div>
                      )}
                      <div className=\"pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0\" />
                      <div className=\"absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px]\">
                        <span className=\"line-clamp-1 text-white drop-shadow\">
                          {post.caption || \"Sem legenda\"}
                        </span>
                        <span className=\"rounded-full bg-white/95 text-slate-800 px-2 py-0.5 font-semibold uppercase tracking-wide\">
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

