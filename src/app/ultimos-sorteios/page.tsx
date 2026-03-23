"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SorteioRow = {
  id: string;
  user_id: string;
  media_id: string;
  winners: { username: string }[];
  created_at: string;
};

type MediaPreview = {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  media_type?: string;
  like_count?: number;
  comments_count?: number;
};

export default function UltimosSorteiosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<SorteioRow[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, MediaPreview>>({});

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (error || !user) {
        router.replace("/");
        return;
      }
      const { data, error: listError } = await supabase
        .from("sorteios_realizados")
        .select("id, media_id, winners, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const rows = (data ?? []) as SorteioRow[];
      if (!listError) setList(rows);

      const token = session?.access_token;
      if (!listError && token && rows.length > 0) {
        const mediaIds = [...new Set(rows.map((r) => r.media_id).filter(Boolean))];
        const details = await Promise.all(
          mediaIds.map(async (mediaId) => {
            try {
              const res = await fetch(`/api/instagram/media/${mediaId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (!res.ok) return null;
              const json = (await res.json()) as MediaPreview;
              return [mediaId, json] as const;
            } catch {
              return null;
            }
          }),
        );

        const nextMap: Record<string, MediaPreview> = {};
        for (const entry of details) {
          if (!entry) continue;
          const [mediaId, media] = entry;
          nextMap[mediaId] = media;
        }
        setMediaMap(nextMap);
      }
      setLoading(false);
    };
    load();
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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 mt-4 md:mt-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/30 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Últimos sorteios
        </h1>
        <p className="text-slate-500 mt-1">
          Histórico dos sorteios que você realizou.
        </p>
        {list.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/70 p-8 text-center text-slate-600">
            Nenhum sorteio realizado ainda. Vá em Meus posts e escolha um post para sortear.
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {list.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
              >
                <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="relative h-[110px] overflow-hidden rounded-lg bg-slate-100">
                    {mediaMap[s.media_id]?.thumbnail_url || mediaMap[s.media_id]?.media_url ? (
                      <img
                        src={mediaMap[s.media_id]?.thumbnail_url || mediaMap[s.media_id]?.media_url}
                        alt={mediaMap[s.media_id]?.caption || "Post sorteado"}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-500">
                        Sem prévia
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">
                      {mediaMap[s.media_id]?.caption?.trim() || `Post ${s.media_id}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(s.created_at).toLocaleString("pt-BR")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>Post ID: {s.media_id}</span>
                      {typeof mediaMap[s.media_id]?.like_count === "number" && (
                        <span>{mediaMap[s.media_id]?.like_count} curtidas</span>
                      )}
                      {typeof mediaMap[s.media_id]?.comments_count === "number" && (
                        <span>{mediaMap[s.media_id]?.comments_count} comentários</span>
                      )}
                      {mediaMap[s.media_id]?.permalink && (
                        <a
                          href={mediaMap[s.media_id]?.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#0240ac] hover:underline"
                        >
                          Ver post no Instagram
                        </a>
                      )}
                    </div>
                    {Array.isArray(s.winners) && s.winners.length > 0 && (
                      <p className="text-xs text-slate-700 mt-2">
                        Ganhador(es):{" "}
                        {s.winners
                          .map((w: { username?: string }) => `@${w.username ?? "?"}`)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
