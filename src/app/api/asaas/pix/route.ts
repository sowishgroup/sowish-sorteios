import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, createDecipheriv } from "crypto";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

const getSupabaseAnon = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseAnonKey);
};

const PRECO = 4.9;
const PACKAGES = [
  { sorteios: 5, brinde: 0 },
  { sorteios: 10, brinde: 1 },
  { sorteios: 20, brinde: 3 },
];

type Body = {
  packageSorteios?: number;
  cpfCnpj?: string;
  customerName?: string;
};

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function getKey() {
  const secret = process.env.DOC_ENCRYPTION_KEY?.trim() ?? "";
  if (!secret) throw new Error("DOC_ENCRYPTION_KEY não configurada");
  return createHash("sha256").update(secret).digest();
}

function decryptText(payload: string) {
  const [ivB64, tagB64, dataB64] = (payload || "").split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Payload inválido");
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
    }

    const supabaseAnon = getSupabaseAnon();
    const {
      data: { user },
      error: userError,
    } = await supabaseAnon.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json(
        { message: "Sessão inválida. Faça login novamente." },
        { status: 401 }
      );
    }

    const { packageSorteios, cpfCnpj, customerName } = (await req
      .json()
      .catch(() => ({}))) as Body;

    const selected = PACKAGES.find((p) => p.sorteios === packageSorteios);
    if (!selected) {
      return NextResponse.json(
        { message: "Pacote inválido." },
        { status: 400 }
      );
    }

    let doc = onlyDigits(cpfCnpj ?? "");
    let name = (customerName || "").trim();

    const supabaseServer = getSupabaseServer();

    if (!doc) {
      const { data: savedDoc } = await supabaseServer
        .from("user_documents")
        .select("document_encrypted")
        .eq("user_id", user.id)
        .maybeSingle();

      if (savedDoc?.document_encrypted) {
        try {
          doc = onlyDigits(decryptText(String(savedDoc.document_encrypted)));
        } catch (_) {
          doc = "";
        }
      }
    }

    if (!name) {
      const { data: profile } = await supabaseServer
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      name = String(profile?.full_name ?? "").trim();
    }

    if (doc.length !== 11 && doc.length !== 14) {
      return NextResponse.json(
        {
          message:
            "Informe CPF/CNPJ válido ou cadastre o documento em Meus dados.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { message: "Informe seu nome no cadastro para gerar o Pix." },
        { status: 400 }
      );
    }

    const totalCredits = selected.sorteios + selected.brinde;
    const value = Number((selected.sorteios * PRECO).toFixed(2));

    const asaasApiKey = process.env.ASAAS_API_KEY?.trim();
    if (!asaasApiKey) {
      return NextResponse.json(
        { message: "Asaas não configurado no servidor (ASAAS_API_KEY)." },
        { status: 500 }
      );
    }
    const asaasBaseUrl = "https://api.asaas.com/v3";

    const customerRes = await fetch(`${asaasBaseUrl}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },
      body: JSON.stringify({
        name,
        email: user.email ?? undefined,
        cpfCnpj: doc,
        externalReference: user.id,
      }),
    });
    const customerJson = await customerRes.json().catch(() => ({}));
    if (!customerRes.ok || !customerJson?.id) {
      return NextResponse.json(
        {
          message:
            customerJson?.errors?.[0]?.description ??
            "Erro ao criar cliente no Asaas.",
        },
        { status: 400 }
      );
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const paymentRes = await fetch(`${asaasBaseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },
      body: JSON.stringify({
        customer: customerJson.id,
        billingType: "PIX",
        value,
        dueDate: dueDateStr,
        description: `${totalCredits} créditos Sowish Sorteios`,
        externalReference: `uid:${user.id}|credits:${totalCredits}`,
      }),
    });
    const paymentJson = await paymentRes.json().catch(() => ({}));
    if (!paymentRes.ok || !paymentJson?.id) {
      return NextResponse.json(
        {
          message:
            paymentJson?.errors?.[0]?.description ??
            "Erro ao gerar cobrança Pix no Asaas.",
        },
        { status: 400 }
      );
    }

    const qrRes = await fetch(
      `${asaasBaseUrl}/payments/${encodeURIComponent(paymentJson.id)}/pixQrCode`,
      {
        headers: {
          access_token: asaasApiKey,
        },
      }
    );
    const qrJson = await qrRes.json().catch(() => ({}));
    if (!qrRes.ok) {
      return NextResponse.json(
        {
          message:
            qrJson?.errors?.[0]?.description ??
            "Cobrança criada, mas não foi possível carregar QR Code.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        paymentId: paymentJson.id as string,
        value,
        totalCredits,
        qrCodeImage: qrJson.encodedImage ?? "",
        pixCopyPaste: qrJson.payload ?? "",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Erro ao criar Pix Asaas:", e);
    return NextResponse.json(
      { message: "Erro inesperado ao criar cobrança Pix." },
      { status: 500 }
    );
  }
}

