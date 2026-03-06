"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PRECO = 4.9;
const PACOTES = [
  { sorteios: 5, brinde: 0 },
  { sorteios: 10, brinde: 1 },
  { sorteios: 20, brinde: 3 },
];

export default function ComprarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.replace("/");
        return;
      }
      const { data } = await supabase.from("user_credits").select("saldo_creditos").eq("user_id", user.id).maybeSingle();
      setCredits(data?.saldo_creditos ?? 0);
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
        <h1 className="text-2xl font-semibold text-slate-900">Comprar créditos</h1>
        <p className="text-slate-500 mt-1">
          Cada crédito = 1 sorteio. Saldo atual: <strong>{credits ?? 0} créditos</strong>. R$ {PRECO.toFixed(2).replace(".", ",")} por crédito.
        </p>
        <div className="grid gap-6 sm:grid-cols-3 mt-8">
          {PACOTES.map((p) => {
            const total = p.sorteios + p.brinde;
            const preco = p.sorteios * PRECO;
            return (
              <div key={p.sorteios} className="rounded-2xl border border-slate-200/80 bg-white/70 p-6">
                <p className="text-2xl font-bold text-slate-900">{p.sorteios} sorteios</p>
                {p.brinde > 0 && (
                  <p className="text-sm font-medium text-emerald-600">+ {p.brinde} brinde = {total} total</p>
                )}
                <p className="mt-4 text-3xl font-bold text-[#E1306C]">R$ {preco.toFixed(2).replace(".", ",")}</p>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#E1306C] to-[#F77737] text-white font-semibold py-3 text-sm hover:brightness-110"
                  onClick={() => alert("Pagamento por Pix em breve.")}
                >
                  Comprar com Pix
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-sm text-slate-500 text-center">Pix em breve. Contate o suporte para créditos.</p>
        <div className="mt-6 text-center">
          <Link href="/conta" className="text-sm text-[#E1306C] hover:underline">Voltar para Meus dados</Link>
        </div>
      </div>
    </main>
  );
}
