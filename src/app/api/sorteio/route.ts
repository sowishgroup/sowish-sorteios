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
};

async function fetchAllComments(
  mediaId: string,
  accessToken: string
): Promise<Comment[]> {
  let url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
    mediaId
  )}/comments?fields=id,text,username&limit=100&access_token=${encodeURIComponent(
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
        comments.push({
          id: c.id,
          text: c.text ?? "",
          username: c.username ?? "desconhecido",
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
    }: {
      userId: string;
      mediaId: string;
      numWinners: number;
      keyword: string | null;
      uniquePerUser: boolean;
    } = body;

    if (!userId || !mediaId || !numWinners || numWinners <= 0) {
      return NextResponse.json(
        { message: "Parâmetros inválidos para o sorteio." },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // 1) Verificar créditos do usuário
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

    const novoSaldo = creditsRow.saldo_creditos - 1;

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
        if (seen.has(c.username)) return false;
        seen.add(c.username);
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

    // 5) Embaralhar e selecionar vencedores
    const embaralhados = shuffle(filtered);
    const winners = embaralhados.slice(0, numWinners);

    return NextResponse.json(
      {
        winners,
        participants: filtered,
        totalComments: allComments.length,
        totalValidAfterFilters: filtered.length,
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

