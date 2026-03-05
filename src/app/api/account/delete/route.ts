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
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { message: "ID do usuário não informado." },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // Limpar dados relacionados
    await supabaseServer
      .from("user_instagram_accounts")
      .delete()
      .eq("user_id", userId);

    await supabaseServer
      .from("user_credits")
      .delete()
      .eq("user_id", userId);

    await supabaseServer.from("profiles").delete().eq("id", userId);

    // Excluir usuário de autenticação
    const { error: deleteError } = await supabaseServer.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      console.error(deleteError);
      return NextResponse.json(
        { message: "Erro ao excluir usuário de autenticação." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { message: "Erro inesperado ao excluir conta." },
      { status: 500 }
    );
  }
}

