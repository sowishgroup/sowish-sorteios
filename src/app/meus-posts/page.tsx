"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type InstagramMedia = {
  id: string;
  caption?: string;
  media_url: string;
  permalink?: string;
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
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/");
        return;
      }

      // Buscar os dados do Instagram para este usuário
      const { data, error } = await supabase
        .from("user_instagram_accounts")
        .select("instagram_business_account_id,long_lived_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setErrorMsg(
          "Não encontramos uma conta do Instagram conectada. Volte ao dashboard e clique em 'Conectar meu Instagram'."
        );
        setLoading(false);
        return;
      }

      try {
        const igAccountId = data.instagram_business_account_id as string;
        const token = data.long_lived_token as string;

        const mediaRes = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(
            igAccountId
          )}/media?fields=id,caption,media_url,permalink&limit=15&access_token=${encodeURIComponent(
            token
          )}`
        );
        const mediaData = await mediaRes.json();

        if (!mediaRes.ok || !Array.isArray(mediaData.data)) {
          console.error("Erro ao buscar mídias do Instagram:", mediaData);
          setErrorMsg("Erro ao buscar postagens do Instagram.");
          setLoading(false);
          return;
        }

        setPosts(mediaData.data as InstagramMedia[]);
      } catch (err) {
        console.error("Erro inesperado ao buscar posts:", err);
        setErrorMsg("Erro inesperado ao buscar postagens.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-300">Carregando suas postagens...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400/80">
              Conteúdo
            </p>
            <h1 className="text-2xl font-semibold">
              Meus posts do{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FEDA77] via-[#F56040] to-[#D62976]">
                Instagram
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Selecione um post para configurar o sorteio.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-white/15 bg-slate-950/90 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900/80 transition"
          >
            Voltar ao dashboard
          </button>
        </header>

        {errorMsg ? (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {errorMsg}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhuma postagem encontrada para esta conta.
          </p>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/sorteio/${post.id}?media_url=${encodeURIComponent(post.media_url)}&caption=${encodeURIComponent(post.caption ?? "")}`}
                className="group rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-lg hover:shadow-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F56040]"
              >
                <div className="relative aspect-square">
                  <Image
                    src={post.media_url}
                    alt={post.caption ?? "Post do Instagram"}
                    fill
                    className="object-cover group-hover:scale-[1.04] transition-transform"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-80" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px]">
                    <span className="line-clamp-1 text-slate-50">
                      {post.caption || "Sem legenda"}
                    </span>
                    <span className="rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wide">
                      Sortear
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

