import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

type Comment = {
  id: string;
  text: string;
  username: string;
  user_id?: string | null;
  avatar_url?: string | null;
};

async function enrichProfilePictures(
  comments: Comment[],
  accessToken: string
): Promise<Comment[]> {
  const ids = Array.from(
    new Set(
      comments
        .map((c) => (c.user_id ?? "").trim())
        .filter((id) => id.length > 0)
    )
  );

  if (ids.length === 0) return comments;

  const avatarMap = new Map<string, string>();

  await Promise.all(
    ids.map(async (id) => {
      try {
        const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
          id
        )}?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(
          accessToken
        )}`;
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        if (
          res.ok &&
          json &&
          typeof json.profile_picture_url === "string" &&
          json.profile_picture_url.trim()
        ) {
          avatarMap.set(id, json.profile_picture_url.trim());
        }
      } catch (_) {
        // Ignorar falhas individuais de avatar para não quebrar o sorteio.
      }
    })
  );

  return comments.map((c) => ({
    ...c,
    avatar_url: c.user_id ? avatarMap.get(c.user_id) ?? null : null,
  }));
}

async function fetchAllComments(
  mediaId: string,
  accessToken: string
): Promise<Comment[]> {
  // Usar "from" em vez de "username" - a API retorna username vazio em alguns casos,
  // mas "from" contém { id, username } e funciona melhor com instagram_manage_comments
  let url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
    mediaId
  )}/comments?fields=id,text,from&limit=100&access_token=${encodeURIComponent(
    accessToken
  )}`;

  const comments: Comment[] = [];
  let safetyCounter = 0;

  while (url && safetyCounter < 100) {
    safetyCounter += 1;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("Erro ao buscar comentários:", data);
      throw new Error("Erro ao buscar comentários da mídia.");
    }

    if (Array.isArray(data.data)) {
      for (const c of data.data) {
        const from = c.from;
        const username =
          (from && typeof from.username === "string" && from.username.trim())
            ? from.username.trim()
            : (typeof c.username === "string" && c.username.trim())
              ? c.username.trim()
              : "desconhecido";
        comments.push({
          id: c.id,
          text: c.text ?? "",
          username,
          user_id:
            from && typeof from.id === "string" && from.id.trim()
              ? from.id.trim()
              : null,
        });
      }
    }

    if (data.paging && data.paging.next) {
      url = data.paging.next as string;
    } else {
      url = "";
    }
  }

  return comments;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      mediaId,
      numWinners,
      keyword,
      uniquePerUser,
      previewOnly,
    }: {
      userId: string;
      mediaId: string;
      numWinners: number;
      keyword: string | null;
      uniquePerUser: boolean;
      previewOnly?: boolean;
    } = body;

    if (!userId || !mediaId || !numWinners || numWinners <= 0) {
      return NextResponse.json(
        { message: "Parâmetros inválidos para o sorteio." },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    let novoSaldo: number | null = null;

    // 1) Verificar/debitar crédito somente quando for o sorteio final
    if (!previewOnly) {
      const { data: creditsRow, error: creditsError } = await supabaseServer
        .from("user_credits")
        .select("saldo_creditos")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        console.error("Erro ao buscar créditos:", creditsError);
        return NextResponse.json(
          { message: "Erro ao verificar créditos do usuário." },
          { status: 500 }
        );
      }

      if (!creditsRow || creditsRow.saldo_creditos <= 0) {
        return NextResponse.json(
          { message: "Você não possui créditos suficientes para realizar o sorteio." },
          { status: 400 }
        );
      }

      novoSaldo = creditsRow.saldo_creditos - 1;

      const { error: updateCreditsError } = await supabaseServer
        .from("user_credits")
        .update({ saldo_creditos: novoSaldo })
        .eq("user_id", userId);

      if (updateCreditsError) {
        console.error("Erro ao debitar crédito:", updateCreditsError);
        return NextResponse.json(
          { message: "Erro ao debitar crédito do usuário." },
          { status: 500 }
        );
      }
    }

    // 2) Buscar token do Instagram no Supabase
    const { data: igRow, error: igError } = await supabaseServer
      .from("user_instagram_accounts")
      .select("long_lived_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (igError || !igRow) {
      console.error("Erro ao buscar credenciais do Instagram:", igError);
      return NextResponse.json(
        { message: "Conta do Instagram não encontrada para este usuário." },
        { status: 400 }
      );
    }

    const accessToken = igRow.long_lived_token as string;

    // 3) Buscar todos os comentários da mídia (com paginação)
    const allComments = await fetchAllComments(mediaId, accessToken);

    if (allComments.length === 0) {
      return NextResponse.json(
        { message: "Nenhum comentário encontrado para este post." },
        { status: 200 }
      );
    }

    // 4) Aplicar filtros (palavra-chave e duplicados)
    let filtered = allComments;

    if (keyword && keyword.trim() !== "") {
      const kw = keyword.trim().toLowerCase();
      filtered = filtered.filter((c) =>
        c.text.toLowerCase().includes(kw)
      );
    }

    if (uniquePerUser) {
      const seen = new Set<string>();
      filtered = filtered.filter((c) => {
        const key = c.user_id || c.username;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (filtered.length === 0) {
      return NextResponse.json(
        {
          message:
            "Nenhum comentário válido após aplicar os filtros definidos.",
        },
        { status: 200 }
      );
    }

    const filteredWithAvatar = await enrichProfilePictures(filtered, accessToken);

    // Preview para exibir quantidade de válidos antes de sortear
    if (previewOnly) {
      return NextResponse.json(
        {
          participants: filteredWithAvatar,
          totalComments: allComments.length,
          totalValidAfterFilters: filteredWithAvatar.length,
        },
        { status: 200 }
      );
    }

    // 5) Embaralhar e selecionar vencedores
    const embaralhados = shuffle(filteredWithAvatar);
    const winners = embaralhados.slice(0, numWinners);

    // 6) Registrar no histórico (sorteios_realizados)
    const { error: histError } = await supabaseServer.from("sorteios_realizados").insert({
      user_id: userId,
      media_id: mediaId,
      winners: winners.map((w) => ({ id: w.id, username: w.username, text: w.text })),
    });
    if (histError) console.error("Erro ao salvar histórico do sorteio:", histError);

    return NextResponse.json(
      {
        winners,
        participants: filteredWithAvatar,
        totalComments: allComments.length,
        totalValidAfterFilters: filteredWithAvatar.length,
        remainingCredits: novoSaldo,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Erro inesperado no sorteio:", e);
    return NextResponse.json(
      { message: "Erro inesperado ao processar o sorteio." },
      { status: 500 }
    );
  }
}

