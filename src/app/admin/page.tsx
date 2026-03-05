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
      <main className="min-h-screen bg-white text-slate-600 flex items-center justify-center">
        <p className="text-sm text-slate-500">Carregando painel admin...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-white text-slate-700 flex items-center justify-center">
        <p className="text-sm text-slate-500">
          Acesso negado. Esta área é restrita a administradores.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Admin
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
            Painel de administração
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie usuários, créditos e comunicados globais.
          </p>
        </header>

        {summary && (
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs font-semibold text-slate-600">
                Usuários cadastrados
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {summary.totalUsers ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs font-semibold text-slate-600">
                Créditos em circulação
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {summary.totalCredits ?? 0}
                <span className="ml-1 text-sm text-slate-500">créditos</span>
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2 items-start">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-700">
              Adicionar créditos manuais
            </p>
            <p className="text-xs text-slate-500">
              Use para bonificar clientes, resolver suporte ou conceder créditos
              promocionais.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  E-mail do usuário
                </label>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                  placeholder="cliente@exemplo.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Quantidade de créditos
                </label>
                <input
                  type="number"
                  min={1}
                  value={grantAmount}
                  onChange={(e) =>
                    setGrantAmount(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGrantCredits}
              className="w-full rounded-xl bg-gradient-to-r from-[#E1306C] to-[#F77737] hover:brightness-110 text-white font-semibold py-2.5 text-sm transition"
            >
              Adicionar créditos
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-700">
              Enviar comunicado global
            </p>
            <p className="text-xs text-slate-500">
              Publica um banner de atualização que será exibido no painel dos
              usuários.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Título
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                  placeholder="Nova funcionalidade, manutenção programada..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Mensagem
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C] resize-none"
                  placeholder="Escreva o comunicado que aparecerá para todos os usuários."
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleBroadcast}
              className="w-full rounded-xl bg-gradient-to-r from-[#E1306C] to-[#F77737] hover:brightness-110 text-white font-semibold py-2.5 text-sm transition"
            >
              Publicar comunicado
            </button>
          </div>
        </section>

        {(feedback || errorMsg) && (
          <div className="max-w-2xl">
            {feedback && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                {feedback}
              </p>
            )}
            {errorMsg && (
              <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

