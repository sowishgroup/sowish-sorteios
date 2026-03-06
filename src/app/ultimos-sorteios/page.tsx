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

export default function UltimosSorteiosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<SorteioRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
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
      if (!listError) setList((data ?? []) as SorteioRow[]);
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
                className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Post ID: {s.media_id}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(s.created_at).toLocaleString("pt-BR")}
                  </p>
                  {Array.isArray(s.winners) && s.winners.length > 0 && (
                    <p className="text-xs text-slate-600 mt-1">
                      Ganhador(es): {s.winners.map((w: { username?: string }) => `@${w.username ?? "?"}`).join(", ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
