import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

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

type Body = {
  documentType?: "CPF" | "CNPJ";
  documentNumber?: string;
};

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function maskDocument(type: "CPF" | "CNPJ", digits: string) {
  if (type === "CPF") {
    return `***.***.***-${digits.slice(-2)}`;
  }
  return `**.***.***/****-${digits.slice(-2)}`;
}

function getKey() {
  const secret = process.env.DOC_ENCRYPTION_KEY?.trim() ?? "";
  if (!secret) throw new Error("DOC_ENCRYPTION_KEY não configurada");
  return createHash("sha256").update(secret).digest();
}

function encryptText(plain: string) {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
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

async function getUserIdFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabaseAnon = getSupabaseAnon();
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user?.id) return null;
  return user.id;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from("user_documents")
      .select("document_type, document_masked, document_encrypted")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          message:
            error.code === "42P01"
              ? "Tabela user_documents não encontrada. Execute o SQL de segurança no Supabase."
              : "Erro ao carregar documento.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { documentType: null, documentMasked: null, hasDocument: false },
        { status: 200 }
      );
    }

    let documentNumber = "";
    try {
      documentNumber = decryptText(String(data.document_encrypted));
    } catch {
      // se a chave mudar/erro, não quebrar a tela
      documentNumber = "";
    }

    return NextResponse.json(
      {
        documentType: data.document_type ?? null,
        documentMasked: data.document_masked ?? null,
        documentNumber,
        hasDocument: true,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Erro GET /api/account/document:", e);
    return NextResponse.json({ message: "Erro inesperado." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
    }

    const { documentType, documentNumber } = (await req.json().catch(() => ({}))) as Body;
    const digits = onlyDigits(documentNumber ?? "");

    if (documentType !== "CPF" && documentType !== "CNPJ") {
      return NextResponse.json({ message: "Tipo de documento inválido." }, { status: 400 });
    }

    if ((documentType === "CPF" && digits.length !== 11) || (documentType === "CNPJ" && digits.length !== 14)) {
      return NextResponse.json({ message: "Número de documento inválido." }, { status: 400 });
    }

    const encrypted = encryptText(digits);
    const hash = createHash("sha256").update(digits).digest("hex");
    const masked = maskDocument(documentType, digits);

    const supabaseServer = getSupabaseServer();
    const { error } = await supabaseServer.from("user_documents").upsert(
      {
        user_id: userId,
        document_type: documentType,
        document_masked: masked,
        document_hash: hash,
        document_encrypted: encrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json(
        {
          message:
            error.code === "42P01"
              ? "Tabela user_documents não encontrada. Execute o SQL de segurança no Supabase."
              : "Erro ao salvar documento.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, documentType, documentMasked: masked },
      { status: 200 }
    );
  } catch (e) {
    console.error("Erro POST /api/account/document:", e);
    const msg =
      e instanceof Error && e.message.includes("DOC_ENCRYPTION_KEY")
        ? "DOC_ENCRYPTION_KEY não configurada no servidor."
        : "Erro inesperado.";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

