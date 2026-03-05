"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
   const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Quando a confirmação de e-mail está ativada no Supabase,
        // o usuário precisa confirmar o endereço antes de conseguir logar.
        if (!data.session) {
          setInfoMsg(
            "Cadastro realizado! Enviamos um e-mail de confirmação. Verifique sua caixa de entrada e confirme o endereço para poder entrar."
          );
          return;
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Ocorreu um erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/dashboard`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro ao fazer login com Google.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-slate-900/70 border border-slate-700/60 p-8 shadow-2xl backdrop-blur">
      <h2 className="text-2xl font-semibold mb-2">
        {mode === "login" ? "Entre na sua conta" : "Crie sua conta"}
      </h2>
      <p className="text-sm text-slate-400 mb-6">
        Acesse o painel para criar e gerenciar seus sorteios no Instagram.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="voce@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Senha</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Mínimo de 6 caracteres"
          />
        </div>

        {infoMsg && (
          <p className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-700/60 rounded-md px-3 py-2">
            {infoMsg}
          </p>
        )}

        {errorMsg && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading
            ? "Processando..."
            : mode === "login"
            ? "Entrar"
            : "Criar conta"}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-700" />
        <span className="text-xs text-slate-400">ou</span>
        <div className="h-px flex-1 bg-slate-700" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-900 text-sm py-2.5 flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="font-medium">Entrar com Google</span>
      </button>

      <p className="mt-6 text-xs text-slate-400 text-center">
        {mode === "login" ? (
          <>
            Ainda não tem conta?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-emerald-400 hover:underline font-medium"
            >
              Criar agora
            </button>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-emerald-400 hover:underline font-medium"
            >
              Fazer login
            </button>
          </>
        )}
      </p>
    </div>
  );
}

