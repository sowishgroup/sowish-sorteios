import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

type Body = {
  userId?: string;
  mediaId?: string;
  usernames?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const { userId, mediaId, usernames }: Body = await req.json().catch(
      () => ({} as Body)
    );

    if (!userId || !mediaId) {
      return NextResponse.json(
        { message: "Usuário ou mídia não informados." },
        { status: 400 }
      );
    }

    const cleanUsernames = Array.from(
      new Set(
        (usernames ?? [])
          .map((u) => (u || "").trim())
          .filter(
            (u) =>
              u &&
              u.toLowerCase() !== "desconhecido" &&
              u !== "?" &&
              !u.includes(" ")
          )
      )
    );

    if (cleanUsernames.length === 0) {
      return NextResponse.json(
        {
          message:
            "Não foi possível identificar o @ do ganhador para comentar automaticamente.",
        },
        { status: 400 }
      );
    }

    const mentions = cleanUsernames.map((u) =>
      u.startsWith("@") ? u : `@${u}`
    );

    const message =
      mentions.length === 1
        ? `Parabéns ${mentions[0]}! Você foi o ganhador do sorteio realizado pelo Sowish Sorteios.`
        : `Parabéns ${mentions.join(
            ", "
          )}! Vocês foram os ganhadores do sorteio realizado pelo Sowish Sorteios.`;

    const supabaseServer = getSupabaseServer();

    const { data: igRow, error: igError } = await supabaseServer
      .from("user_instagram_accounts")
      .select("long_lived_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (igError || !igRow) {
      console.error(
        "Erro ao buscar credenciais do Instagram para comentar:",
        igError
      );
      return NextResponse.json(
        {
          message:
            "Conta do Instagram não encontrada. Conecte novamente e tente de novo.",
        },
        { status: 400 }
      );
    }

    const accessToken = igRow.long_lived_token as string;

    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
      mediaId
    )}/comments?access_token=${encodeURIComponent(accessToken)}`;

    const igRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    });

    const igJson = await igRes.json().catch(() => ({}));

    if (!igRes.ok) {
      console.error("Erro ao criar comentário no Instagram:", igJson);
      return NextResponse.json(
        {
          message:
            igJson?.error?.message ??
            "Erro ao criar comentário no Instagram. Tente novamente.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: igJson.id ?? null,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Erro inesperado ao comentar na mídia:", e);
    return NextResponse.json(
      { message: "Erro inesperado ao comentar no Instagram." },
      { status: 500 }
    );
  }
}

