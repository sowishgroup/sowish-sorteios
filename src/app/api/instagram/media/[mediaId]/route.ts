import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (supabaseUrl && supabaseAnonKey) {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error } = await client.auth.getUser(token);
      if (!error && user?.id) return user.id;
    }
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    if (!mediaId) {
      return NextResponse.json({ message: "mediaId obrigatório" }, { status: 400 });
    }
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const supabaseServer = getSupabaseServer();
    const { data: account, error: accountError } = await supabaseServer
      .from("user_instagram_accounts")
      .select("long_lived_token")
      .eq("user_id", userId)
      .maybeSingle();
    if (accountError || !account) {
      return NextResponse.json({ message: "Conta Instagram não encontrada" }, { status: 404 });
    }
    const token = account.long_lived_token as string;
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
      mediaId
    )}?fields=id,caption,media_url,thumbnail_url,permalink,media_type,like_count,comments_count&access_token=${encodeURIComponent(
      token
    )}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      return NextResponse.json(
        { message: data.error.message ?? "Erro ao buscar mídia" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      id: String(data.id),
      caption: data.caption != null ? String(data.caption) : undefined,
      media_url: data.media_url != null ? String(data.media_url) : undefined,
      thumbnail_url: data.thumbnail_url != null ? String(data.thumbnail_url) : undefined,
      permalink: data.permalink != null ? String(data.permalink) : undefined,
      media_type: data.media_type != null ? String(data.media_type) : undefined,
      like_count: typeof data.like_count === "number" ? data.like_count : 0,
      comments_count: typeof data.comments_count === "number" ? data.comments_count : 0,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Erro inesperado" }, { status: 500 });
  }
}
