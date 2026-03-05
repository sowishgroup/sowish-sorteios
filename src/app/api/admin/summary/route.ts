import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { adminId } = await req.json();

    if (!adminId) {
      return NextResponse.json(
        { message: "Admin não informado." },
        { status: 400 }
      );
    }

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

    const { count: totalUsers } = await supabaseServer
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { data: creditsRows } = await supabaseServer
      .from("user_credits")
      .select("saldo_creditos");

    const totalCredits =
      creditsRows?.reduce((sum, row) => sum + (row.saldo_creditos ?? 0), 0) ??
      0;

    return NextResponse.json(
      {
        totalUsers: totalUsers ?? 0,
        totalCredits,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { message: "Erro ao carregar resumo admin." },
      { status: 500 }
    );
  }
}

