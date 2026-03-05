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
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-300">Carregando conta...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400/80">
              Conta
            </p>
            <h1 className="text-2xl font-semibold">Painel do usuário</h1>
            <p className="text-sm text-slate-400 mt-1">
              Gerencie seus dados, créditos e preferências.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start rounded-full border border-white/15 bg-slate-950/90 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900/80 transition"
          >
            Sair da conta
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] items-start">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 space-y-5 shadow">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="relative h-20 w-20 rounded-full border border-white/15 bg-slate-900 flex items-center justify-center overflow-hidden group"
                >
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold">
                      {(profile?.full_name || email || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 text-[10px] flex items-center justify-center transition">
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
                  <p className="text-xs text-slate-400">
                    {email ?? "sem e-mail"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
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
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#F56040] focus:border-[#F56040]"
                    placeholder="Como quer aparecer nos relatórios de sorteio"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 rounded-md px-3 py-2">
                  {successMsg}
                </p>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="mt-1 w-full rounded-xl bg-gradient-to-r from-[#FEDA77] via-[#F56040] to-[#D62976] hover:brightness-110 text-slate-950 font-semibold py-2.5 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-200">
                Segurança e acesso
              </p>
              <p className="text-xs text-slate-400">
                Em breve você poderá alterar sua senha diretamente por aqui. No
                momento, utilize o fluxo de redefinição via e-mail caso
                esqueça.
              </p>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Créditos
                  </p>
                  <p className="mt-1 text-3xl font-bold">
                    {credits ?? 0}
                    <span className="ml-1 text-sm text-slate-400">créditos</span>
                  </p>
                </div>
                <div className="relative h-14 w-14 rounded-full bg-gradient-to-tr from-[#FEDA77] via-[#F56040] to-[#D62976] p-[2px]">
                  <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center text-[10px] text-slate-200">
                    Sorteios
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Você pode usar 1 crédito por sorteio rodado. Créditos gratuitos
                podem ser concedidos em campanhas promocionais.
              </p>
              <button
                type="button"
                onClick={() => router.push("/comprar")}
                className="w-full rounded-lg bg-[#F56040] hover:bg-[#D62976] text-xs font-semibold py-2.5 transition"
              >
                Comprar créditos (Pix em breve)
              </button>
            </div>

            <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-5 space-y-3">
              <p className="text-sm font-semibold text-red-200">
                Encerrar conta
              </p>
              <p className="text-xs text-red-100/80">
                Ao excluir sua conta, todos os sorteios, dados conectados do
                Instagram e créditos restantes serão removidos de forma
                permanente.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full rounded-lg border border-red-500/70 bg-transparent text-xs font-semibold py-2.5 text-red-200 hover:bg-red-900/40 transition"
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

