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
  const [userId, setUserId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [activePackage, setActivePackage] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pixInfo, setPixInfo] = useState<{
    paymentId: string;
    value: number;
    totalCredits: number;
    qrCodeImage: string;
    pixCopyPaste: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.replace("/");
        return;
      }
      setUserId(user.id);
      setCustomerName(
        (user.user_metadata?.full_name as string | undefined) ??
          user.email?.split("@")[0] ??
          ""
      );
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
                  onClick={() => {
                    setActivePackage(p.sorteios);
                    setCheckoutError(null);
                    setPixInfo(null);
                  }}
                >
                  Comprar com Pix
                </button>
              </div>
            );
          })}
        </div>
        {activePackage && (
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/80 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-700">
              Finalizar compra com Pix
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Nome completo / Razão social</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                  placeholder="Nome para cobrança"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">CPF ou CNPJ</label>
                <input
                  type="text"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E1306C] focus:border-[#E1306C]"
                  placeholder="Opcional: usa o documento salvo no cadastro"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!userId || checkoutLoading}
              onClick={async () => {
                if (!userId) return;
                setCheckoutLoading(true);
                setCheckoutError(null);
                setPixInfo(null);
                try {
                  const { data: sessionData } = await supabase.auth.getSession();
                  const token = sessionData.session?.access_token;
                  if (!token) throw new Error("Sessão inválida.");
                  const res = await fetch("/api/asaas/pix", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      packageSorteios: activePackage,
                      customerName,
                      cpfCnpj,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.message ?? "Erro ao criar Pix.");
                  setPixInfo(json);
                } catch (err: any) {
                  setCheckoutError(err.message ?? "Erro ao gerar cobrança Pix.");
                } finally {
                  setCheckoutLoading(false);
                }
              }}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#E1306C] to-[#F77737] text-white font-semibold py-2.5 px-4 text-sm hover:brightness-110 disabled:opacity-60"
            >
              {checkoutLoading ? "Gerando Pix..." : "Gerar cobrança Pix"}
            </button>
            {checkoutError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {checkoutError}
              </p>
            )}
            {pixInfo && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <p className="text-xs text-emerald-800">
                  Cobrança criada com sucesso: <strong>{pixInfo.totalCredits} créditos</strong> por{" "}
                  <strong>R$ {pixInfo.value.toFixed(2).replace(".", ",")}</strong>.
                </p>
                {pixInfo.qrCodeImage && (
                  <div className="flex justify-center">
                    <img
                      src={`data:image/png;base64,${pixInfo.qrCodeImage}`}
                      alt="QR Code Pix"
                      className="h-52 w-52 rounded-lg border border-emerald-200 bg-white p-2"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-emerald-900">
                    Copia e cola Pix
                  </p>
                  <textarea
                    readOnly
                    value={pixInfo.pixCopyPaste}
                    rows={3}
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[11px] text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 text-center">
          <Link href="/conta" className="text-sm text-[#E1306C] hover:underline">Voltar para Meus dados</Link>
        </div>
      </div>
    </main>
  );
}
