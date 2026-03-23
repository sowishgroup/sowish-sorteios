import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

type WebhookBody = {
  event?: string;
  payment?: {
    id?: string;
    value?: number;
    status?: string;
    externalReference?: string;
  };
};

function parseReference(ref: string | undefined): { userId: string; credits: number } | null {
  if (!ref) return null;
  const uid = /uid:([^|]+)/.exec(ref)?.[1];
  const creditsRaw = /credits:(\d+)/.exec(ref)?.[1];
  const credits = creditsRaw ? Number(creditsRaw) : 0;
  if (!uid || !credits || credits <= 0) return null;
  return { userId: uid, credits };
}

export async function POST(req: NextRequest) {
  try {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
    if (expectedToken) {
      const receivedToken = req.headers.get("asaas-access-token") ?? "";
      if (receivedToken !== expectedToken) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const body = (await req.json().catch(() => ({}))) as WebhookBody;
    const event = body?.event ?? "";
    const paymentId = body?.payment?.id ?? "";
    const paymentStatus = body?.payment?.status ?? "";
    const extRef = body?.payment?.externalReference;

    if (!paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const shouldCredit =
      event === "PAYMENT_RECEIVED" ||
      event === "PAYMENT_CONFIRMED" ||
      paymentStatus === "RECEIVED" ||
      paymentStatus === "CONFIRMED";

    const supabaseServer = getSupabaseServer();

    const { data: existing } = await supabaseServer
      .from("asaas_payment_events")
      .select("id, credited")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (existing?.credited) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!shouldCredit) {
      await supabaseServer.from("asaas_payment_events").upsert(
        {
          payment_id: paymentId,
          event,
          status: paymentStatus,
          external_reference: extRef ?? null,
          credited: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "payment_id" }
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const ref = parseReference(extRef);
    if (!ref) {
      await supabaseServer.from("asaas_payment_events").upsert(
        {
          payment_id: paymentId,
          event,
          status: paymentStatus,
          external_reference: extRef ?? null,
          credited: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "payment_id" }
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { data: creditsRow } = await supabaseServer
      .from("user_credits")
      .select("saldo_creditos")
      .eq("user_id", ref.userId)
      .maybeSingle();

    const novoSaldo = (creditsRow?.saldo_creditos ?? 0) + ref.credits;

    const { error: upsertCreditsError } = await supabaseServer
      .from("user_credits")
      .upsert({
        user_id: ref.userId,
        saldo_creditos: novoSaldo,
      });

    if (upsertCreditsError) {
      console.error("Erro ao creditar usuário via webhook Asaas:", upsertCreditsError);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    await supabaseServer.from("asaas_payment_events").upsert(
      {
        payment_id: paymentId,
        event,
        status: paymentStatus,
        external_reference: extRef ?? null,
        user_id: ref.userId,
        credits_added: ref.credits,
        credited: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "payment_id" }
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("Erro no webhook Asaas:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

