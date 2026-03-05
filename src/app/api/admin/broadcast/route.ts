import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { adminId, title, message } = await req.json();

    if (!adminId || !title || !message) {
      return NextResponse.json(
        { message: "Parâmetros inválidos." },
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
        { message: "Apenas administradores podem enviar comunicados." },
        { status: 403 }
      );
    }

    const { error } = await supabaseServer.from("announcements").insert({
      title,
      body: message,
      is_active: true,
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { message: "Erro ao salvar comunicado." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { message: "Erro inesperado ao enviar comunicado." },
      { status: 500 }
    );
  }
}

