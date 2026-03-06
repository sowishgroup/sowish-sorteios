"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";
    const safeNext = next.startsWith("/") ? next : "/dashboard";

    if (!code) {
      setErrorMsg("Nenhum código de autorização recebido.");
      setStatus("error");
      return;
    }

    let cancelled = false;

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
          return;
        }
        setStatus("ok");
        window.location.href = safeNext;
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err?.message ?? "Erro ao concluir login.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (status === "error") {
    return (
      <main className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-medium mb-2">Falha ao entrar com Google</p>
          <p className="text-sm text-slate-600 mb-4">{errorMsg}</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
          >
            Voltar ao início
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-slate-600">Concluindo login...</p>
      </div>
    </main>
  );
}

function CallbackFallback() {
  return (
    <main className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-slate-600">Concluindo login...</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
