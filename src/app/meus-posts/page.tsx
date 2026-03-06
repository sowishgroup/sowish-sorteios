"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type InstagramMedia = {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  media_type?: string;
  like_count?: number;
  comments_count?: number;
};

export default function MeusPostsPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<InstagramMedia[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setErrorMsg(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.replace("/");
        return;
      }

      try {
        const res = await fetch("/api/instagram/media", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: session.user.id }),
        });
        const json = await res.json();

        if (Array.isArray(json.data)) {
          setPosts(json.data as InstagramMedia[]);
          if (json.message && json.data.length === 0) {
            setErrorMsg(json.message);
          }
        } else {
          setErrorMsg(json.message ?? "Erro ao carregar postagens.");
        }
      } catch (err) {
        console.error("Erro inesperado ao buscar posts:", err);
        setErrorMsg("Erro inesperado ao buscar postagens.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [router]);

  const postImageUrl = (post: InstagramMedia) => {
    const placeholder =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23e2e8f0' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='18'%3EPost%3C/text%3E%3C/svg%3E";

    // Para vídeos e reels, priorizar thumbnail_url para não tentar usar o mp4 como <img>.
    if (post.media_type && post.media_type !== "IMAGE") {
      return post.thumbnail_url || post.media_url || placeholder;
    }

    return post.media_url || post.thumbnail_url || placeholder;
  };

  if (loading) {
    return (
      <main className="min-h-screen text-slate-700 flex items-center justify-center">
        <p className="text-sm text-slate-500">Carregando suas postagens...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 mt-4 md:mt-6 space-y-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/30 shadow-sm">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
              Conteúdo
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Meus posts do{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E1306C] via-[#F77737] to-[#FCAF45]">
                Instagram
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Selecione um post para configurar o sorteio.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
          >
            Voltar ao dashboard
          </button>
        </header>

        {errorMsg ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-slate-600 font-medium">Nenhuma postagem encontrada</p>
            <p className="text-sm text-slate-500 mt-1">
              Esta conta não tem posts recentes ou a API não retornou mídia. Verifique se o perfil é Business/Criador e se há publicações.
            </p>
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {posts.map((post) => {
              const params = new URLSearchParams();
              const imgUrl = postImageUrl(post);
              if (imgUrl) params.set("media_url", imgUrl);
              if (post.caption) params.set("caption", post.caption);
              if (post.like_count != null) params.set("likes", String(post.like_count));
              if (post.comments_count != null) params.set("comments", String(post.comments_count));
              const qs = params.toString();
              return (
              <Link
                key={post.id}
                href={`/sorteio/${post.id}${qs ? `?${qs}` : ""}`}
                className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1306C]"
              >
                <div className="relative aspect-square bg-slate-100">
                  {/* img nativo para URLs do Instagram (CDN com vários subdomínios) */}
                  <img
                    src={postImageUrl(post)}
                    alt={post.caption ?? "Post do Instagram"}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-80" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px]">
                    <span className="line-clamp-1 text-white drop-shadow">
                      {post.caption || "Sem legenda"}
                    </span>
                    <span className="rounded-full bg-white/90 text-slate-800 px-2 py-1 text-[10px] font-medium uppercase tracking-wide">
                      Sortear
                    </span>
                  </div>
                </div>
              </Link>
            );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

