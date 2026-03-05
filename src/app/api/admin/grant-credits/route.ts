import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(req: NextRequest) {
  try {
    const { adminId, email, amount } = await req.json();

    if (!adminId || !email || !amount || amount <= 0) {
      return NextResponse.json(
        { message: "Parâmetros inválidos." },
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
        { message: "Apenas administradores podem adicionar créditos." },
        { status: 403 }
      );
    }

    const { data: usersList, error: listError } =
      await supabaseServer.auth.admin.listUsers({
        page: 1,
        perPage: 100,
      });

    if (listError) {
      console.error(listError);
      return NextResponse.json(
        { message: "Erro ao buscar usuários." },
        { status: 500 }
      );
    }

    const user = usersList.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { message: "Usuário não encontrado para o e-mail informado." },
        { status: 404 }
      );
    }

    const { data: creditsRow } = await supabaseServer
      .from("user_credits")
      .select("saldo_creditos")
      .eq("user_id", user.id)
      .maybeSingle();

    const novoSaldo = (creditsRow?.saldo_creditos ?? 0) + amount;

    const { error: upsertError } = await supabaseServer
      .from("user_credits")
      .upsert({
        user_id: user.id,
        saldo_creditos: novoSaldo,
      });

    if (upsertError) {
      console.error(upsertError);
      return NextResponse.json(
        { message: "Erro ao atualizar créditos do usuário." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { message: "Erro inesperado ao adicionar créditos." },
      { status: 500 }
    );
  }
}

