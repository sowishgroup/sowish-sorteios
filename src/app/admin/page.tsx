"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Summary = {
  totalUsers: number;
  totalCredits: number;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantAmount, setGrantAmount] = useState(1);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      setFeedback(null);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setLoading(false);
        setIsAdmin(false);
        return;
      }

      setAdminId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      try {
        const res = await fetch("/api/admin/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId: user.id }),
        });
        if (res.ok) {
          const data = (await res.json()) as Summary;
          setSummary(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleGrantCredits = async () => {
    if (!adminId || !grantEmail || grantAmount <= 0) return;
    setFeedback(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/grant-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          email: grantEmail,
          amount: grantAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message ?? "Erro ao adicionar créditos.");
        return;
      }

      setFeedback("Créditos adicionados com sucesso.");
      setGrantEmail("");
      setGrantAmount(1);
    } catch (e) {
      console.error(e);
      setErrorMsg("Erro inesperado ao adicionar créditos.");
    }
  };

  const handleBroadcast = async () => {
    if (!adminId || !broadcastTitle || !broadcastMessage) return;
    setFeedback(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          title: broadcastTitle,
          message: broadcastMessage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message ?? "Erro ao enviar comunicado.");
        return;
      }

      setFeedback("Comunicado enviado para todos os usuários.");
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (e) {
      console.error(e);
      setErrorMsg("Erro inesperado ao enviar comunicado.");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-300">Carregando painel admin...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-300">
          Acesso negado. Esta área é restrita a administradores.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400/80">
            Admin
          </p>
          <h1 className="text-2xl font-semibold md:text-3xl">
            Painel de administração
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie usuários, créditos e comunicados globais.
          </p>
        </header>

        {summary && (
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
              <p className="text-xs font-semibold text-slate-200">
                Usuários cadastrados
              </p>
              <p className="mt-2 text-3xl font-bold">
                {summary.totalUsers ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
              <p className="text-xs font-semibold text-slate-200">
                Créditos em circulação
              </p>
              <p className="mt-2 text-3xl font-bold">
                {summary.totalCredits ?? 0}
                <span className="ml-1 text-sm text-slate-400">créditos</span>
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2 items-start">
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-200">
              Adicionar créditos manuais
            </p>
            <p className="text-xs text-slate-400">
              Use para bonificar clientes, resolver suporte ou conceder créditos
              promocionais.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  E-mail do usuário
                </label>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F56040] focus:border-[#F56040]"
                  placeholder="cliente@exemplo.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Quantidade de créditos
                </label>
                <input
                  type="number"
                  min={1}
                  value={grantAmount}
                  onChange={(e) =>
                    setGrantAmount(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-32 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F56040] focus:border-[#F56040]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGrantCredits}
              className="w-full rounded-xl bg-gradient-to-r from-[#FEDA77] via-[#F56040] to-[#D62976] hover:brightness-110 text-slate-950 font-semibold py-2.5 text-sm transition"
            >
              Adicionar créditos
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-200">
              Enviar comunicado global
            </p>
            <p className="text-xs text-slate-400">
              Publica um banner de atualização que será exibido no painel dos
              usuários.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Título
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D62976] focus:border-[#D62976]"
                  placeholder="Nova funcionalidade, manutenção programada..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Mensagem
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D62976] focus:border-[#D62976] resize-none"
                  placeholder="Escreva o comunicado que aparecerá para todos os usuários."
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleBroadcast}
              className="w-full rounded-xl bg-gradient-to-r from-[#FEDA77] via-[#F56040] to-[#D62976] hover:brightness-110 text-slate-950 font-semibold py-2.5 text-sm transition"
            >
              Publicar comunicado
            </button>
          </div>
        </section>

        {(feedback || errorMsg) && (
          <div className="max-w-2xl">
            {feedback && (
              <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 rounded-md px-3 py-2">
                {feedback}
              </p>
            )}
            {errorMsg && (
              <p className="mt-2 text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

