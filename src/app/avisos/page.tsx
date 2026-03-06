"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export default function AvisosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Announcement[]>([]);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        router.replace("/");
        return;
      }

      const { data } = await supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      setList((data ?? []) as Announcement[]);
      setLoading(false);
    };

    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-600">
        Carregando avisos...
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 mt-4 md:mt-6 space-y-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/30 shadow-sm">
        <header className="border-b border-slate-200/70 pb-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Centro de avisos
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Mensagens e novidades
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Aqui você acompanha comunicados importantes sobre o Sowish
            Sorteios.
          </p>
        </header>

        {list.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum aviso disponível no momento.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {a.title}
                  </h2>
                  <span className="text-[10px] text-slate-500">
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 whitespace-pre-line">
                  {a.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

