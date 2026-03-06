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
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { message: "Não autorizado. Faça login novamente." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await client.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json(
        { message: "Sessão inválida. Faça login novamente." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const userId = (body as { userId?: string }).userId;

    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { message: "ID do usuário inválido ou não corresponde à sessão." },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    const { error: deleteError } = await supabaseServer
      .from("user_instagram_accounts")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Erro ao desconectar Instagram:", deleteError);
      return NextResponse.json(
        { message: "Erro ao desconectar conta do Instagram." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("Erro inesperado ao desconectar Instagram:", e);
    return NextResponse.json(
      { message: "Erro inesperado ao desconectar Instagram." },
      { status: 500 }
    );
  }
}
