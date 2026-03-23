import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

type Body = {
  adminId?: string;
  asaasWebhookUrl?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { adminId, asaasWebhookUrl } = (await req
      .json()
      .catch(() => ({}))) as Body;

    if (!adminId) {
      return NextResponse.json(
        { message: "Admin não informado." },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    const { data: adminProfile } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", adminId)
      .maybeSingle();

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json(
        { message: "Apenas administradores podem acessar este recurso." },
        { status: 403 }
      );
    }

    const shouldSave = typeof asaasWebhookUrl === "string";

    if (shouldSave) {
      const { error: upsertError } = await supabaseServer
        .from("app_settings")
        .upsert(
          {
            id: 1,
            asaas_webhook_url: (asaasWebhookUrl ?? "").trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("Erro ao salvar configurações Asaas:", upsertError);
        return NextResponse.json(
          {
            message:
              upsertError.code === "42P01"
                ? "Tabela app_settings não encontrada. Execute o SQL atualizado no Supabase."
                : "Erro ao salvar configurações Asaas.",
          },
          { status: 500 }
        );
      }
    }

    const { data: settings, error: getError } = await supabaseServer
      .from("app_settings")
      .select("asaas_webhook_url")
      .eq("id", 1)
      .maybeSingle();

    if (getError) {
      console.error("Erro ao carregar configurações Asaas:", getError);
      return NextResponse.json(
        {
          message:
            getError.code === "42P01"
              ? "Tabela app_settings não encontrada. Execute o SQL atualizado no Supabase."
              : "Erro ao carregar configurações Asaas.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        asaasWebhookUrl: settings?.asaas_webhook_url ?? "",
        asaasApiKeyConfigured: Boolean(process.env.ASAAS_API_KEY),
        webhookTokenConfigured: Boolean(process.env.ASAAS_WEBHOOK_TOKEN),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Erro inesperado em asaas-settings:", e);
    return NextResponse.json(
      { message: "Erro inesperado ao processar configurações Asaas." },
      { status: 500 }
    );
  }
}

