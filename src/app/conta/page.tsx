"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function ContaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/");
        return;
      }

      setEmail(user.email ?? null);

      const [{ data: profileData }, { data: creditsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_credits")
          .select("saldo_creditos")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      setProfile(
        profileData ?? {
          id: user.id,
          full_name: user.user_metadata?.full_name ?? null,
          avatar_url: null,
        }
      );
      setCredits(creditsData?.saldo_creditos ?? 0);
      setLoading(false);
    };

    loadData();
  }, [router]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: publicUrl,
        });

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: publicUrl });
      setSuccessMsg("Foto de perfil atualizada com sucesso.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        "Erro ao enviar a foto de perfil. Verifique o tamanho/format e tente novamente."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      });

      if (error) throw error;

      setSuccessMsg("Dados atualizados com sucesso.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao salvar dados. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Tem certeza que deseja excluir sua conta? Esta ação é irreversível."
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado.");

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Erro ao excluir conta.");
      }
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message ?? "Erro ao excluir conta.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen text-slate-700 flex items-center justify-center">
        <p className="text-sm text-slate-500">Carregando conta...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 mt-4 md:mt-6 space-y-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/30 shadow-sm">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
              Conta
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Painel do usuário</h1>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie seus dados, créditos e preferências.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start rounded-full border border-slate-300 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
          >
            Sair da conta
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] items-start">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 space-y-5 shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="relative h-20 w-20 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden group"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold">
                      {(profile?.full_name || email || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 text-[10px] text-white flex items-center justify-center transition">
                    Trocar foto
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div>
                  <p className="text-sm font-semibold">
                    {profile?.full_name || "Seu nome"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {email ?? "sem e-mail"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={profile?.full_name ?? ""}
                    onChange={(e) =>
                      setProfile(
                        profile
                          ? { ...profile, full_name: e.target.value }
                          : null
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                    placeholder="Como quer aparecer nos relatórios de sorteio"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  {successMsg}
                </p>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="mt-1 w-full rounded-xl bg-gradient-to-r from-[#E1306C] to-[#F77737] hover:brightness-110 text-white font-semibold py-2.5 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Segurança e acesso
              </p>
              <p className="text-xs text-slate-500">
                Em breve você poderá alterar sua senha diretamente por aqui. No
                momento, utilize o fluxo de redefinição via e-mail caso
                esqueça.
              </p>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Créditos
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {credits ?? 0}
                    <span className="ml-1 text-sm text-slate-500">créditos</span>
                  </p>
                </div>
                <div className="relative h-14 w-14 rounded-full bg-gradient-to-tr from-[#E1306C] to-[#FCAF45] p-[2px]">
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-[10px] text-slate-600">
                    Sorteios
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Você pode usar 1 crédito por sorteio rodado. Créditos gratuitos
                podem ser concedidos em campanhas promocionais.
              </p>
              <button
                type="button"
                onClick={() => router.push("/comprar")}
                className="w-full rounded-lg bg-[#E1306C] hover:bg-[#C13584] text-white text-xs font-semibold py-2.5 transition"
              >
                Comprar créditos (Pix em breve)
              </button>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
              <p className="text-sm font-semibold text-red-700">
                Encerrar conta
              </p>
              <p className="text-xs text-red-600/90">
                Ao excluir sua conta, todos os sorteios, dados conectados do
                Instagram e créditos restantes serão removidos de forma
                permanente.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full rounded-lg border border-red-400 bg-transparent text-xs font-semibold py-2.5 text-red-700 hover:bg-red-100 transition"
              >
                Excluir conta permanentemente
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

