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
  message?: string;
  commentId?: string;
  action?: "create" | "delete" | "update";
};

export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      mediaId,
      usernames,
      message,
      commentId,
      action,
    }: Body = await req.json().catch(
      () => ({} as Body)
    );

    if (!userId || !mediaId) {
      return NextResponse.json(
        { message: "Usuário ou mídia não informados." },
        { status: 400 }
      );
    }

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

    // DELETE comentário
    if (action === "delete") {
      if (!commentId) {
        return NextResponse.json(
          { message: "ID do comentário não informado para exclusão." },
          { status: 400 }
        );
      }

      const deleteUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(
        commentId
      )}?access_token=${encodeURIComponent(accessToken)}`;

      const delRes = await fetch(deleteUrl, { method: "DELETE" });
      const delJson = await delRes.json().catch(() => ({}));

      if (!delRes.ok) {
        console.error("Erro ao excluir comentário no Instagram:", delJson);
        return NextResponse.json(
          {
            message:
              delJson?.error?.message ??
              "Erro ao excluir comentário no Instagram.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // UPDATE: Instagram não possui edição direta via API.
    // Estratégia: excluir comentário antigo e criar um novo com o texto atualizado.
    if (action === "update") {
      if (!commentId) {
        return NextResponse.json(
          { message: "ID do comentário não informado para atualização." },
          { status: 400 }
        );
      }
      const text = (message ?? "").trim();
      if (!text) {
        return NextResponse.json(
          { message: "Texto do comentário não informado." },
          { status: 400 }
        );
      }

      const deleteUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(
        commentId
      )}?access_token=${encodeURIComponent(accessToken)}`;
      const delRes = await fetch(deleteUrl, { method: "DELETE" });
      const delJson = await delRes.json().catch(() => ({}));
      if (!delRes.ok) {
        console.error(
          "Erro ao excluir comentário antigo na atualização:",
          delJson
        );
        return NextResponse.json(
          {
            message:
              delJson?.error?.message ??
              "Erro ao atualizar comentário no Instagram.",
          },
          { status: 400 }
        );
      }

      const createUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(
        mediaId
      )}/comments?access_token=${encodeURIComponent(accessToken)}`;

      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ message: text }),
      });
      const createJson = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        console.error("Erro ao recriar comentário na atualização:", createJson);
        return NextResponse.json(
          {
            message:
              createJson?.error?.message ??
              "Erro ao atualizar comentário no Instagram.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          id: createJson.id ?? null,
          message: text,
        },
        { status: 200 }
      );
    }

    // Criar mensagem base (caso não venha pronta)
    let finalMessage = (message ?? "").trim();

    if (!finalMessage) {
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

      finalMessage =
        mentions.length === 1
          ? `Parabéns ${mentions[0]}! Você foi o ganhador do sorteio realizado pelo Sowish Sorteios.`
          : `Parabéns ${mentions.join(
              ", "
            )}! Vocês foram os ganhadores do sorteio realizado pelo Sowish Sorteios.`;
    }

    const createUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(
      mediaId
    )}/comments?access_token=${encodeURIComponent(accessToken)}`;

    const igRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message: finalMessage }),
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
        message: finalMessage,
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

