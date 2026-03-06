import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

type SorteioHistoricoRow = {
  id: string;
  user_id: string;
  media_id: string;
  winners: { username?: string; id?: string; text?: string }[];
  created_at: string;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = (await req.json()) as { userId?: string };

    if (!userId) {
      return NextResponse.json(
        { message: "Usuário não informado." },
        { status: 400 },
      );
    }

    const supabaseServer = getSupabaseServer();

    const { count: totalDraws } = await supabaseServer
      .from("sorteios_realizados")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: rows } = await supabaseServer
      .from("sorteios_realizados")
      .select("id, user_id, media_id, winners, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const list = (rows ?? []) as SorteioHistoricoRow[];

    const totalWinners = list.reduce(
      (sum, row) => sum + (Array.isArray(row.winners) ? row.winners.length : 0),
      0,
    );

    return NextResponse.json(
      {
        totalDraws: totalDraws ?? 0,
        totalWinners,
        lastDraws: list,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("Erro ao carregar atividade do dashboard:", e);
    return NextResponse.json(
      { message: "Erro ao carregar atividade do dashboard." },
      { status: 500 },
    );
  }
}

