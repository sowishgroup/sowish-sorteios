import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

export type InstagramMediaItem = {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  media_type?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json(
        { message: "ID do usuário não informado." },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    const { data: account, error: accountError } = await supabaseServer
      .from("user_instagram_accounts")
      .select("instagram_business_account_id, long_lived_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        {
          message:
            "Conta do Instagram não encontrada. Conecte no dashboard.",
          data: [],
        },
        { status: 200 }
      );
    }

    const igAccountId = account.instagram_business_account_id as string;
    const token = account.long_lived_token as string;

    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
      igAccountId
    )}/media?fields=id,caption,media_url,thumbnail_url,permalink,media_type&limit=25&access_token=${encodeURIComponent(
      token
    )}`;

    const mediaRes = await fetch(url);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      const errMsg =
        mediaData.error.message ??
        mediaData.error.error_user_msg ??
        "Erro na API do Instagram.";
      console.error("Instagram Graph API error:", mediaData.error);
      return NextResponse.json(
        { message: errMsg, data: [] },
        { status: 200 }
      );
    }

    const rawList = Array.isArray(mediaData.data) ? mediaData.data : [];
    const list: InstagramMediaItem[] = rawList.map((m: Record<string, unknown>) => ({
      id: String(m.id),
      caption: m.caption != null ? String(m.caption) : undefined,
      media_url: m.media_url != null ? String(m.media_url) : undefined,
      thumbnail_url: m.thumbnail_url != null ? String(m.thumbnail_url) : undefined,
      permalink: m.permalink != null ? String(m.permalink) : undefined,
      media_type: m.media_type != null ? String(m.media_type) : undefined,
    }));

    return NextResponse.json({ data: list }, { status: 200 });
  } catch (e) {
    console.error("Erro ao buscar mídia do Instagram:", e);
    return NextResponse.json(
      { message: "Erro inesperado ao buscar postagens.", data: [] },
      { status: 200 }
    );
  }
}
