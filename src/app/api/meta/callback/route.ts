import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // user_id passado no state
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?instagram_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?instagram_error=missing_code_or_state",
        req.url
      )
    );
  }

  try {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
    const appSecret = process.env.FACEBOOK_APP_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI!;

    // 1) Trocar o código por um access token de curta duração
    const shortTokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${encodeURIComponent(
        appId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${encodeURIComponent(
        appSecret
      )}&code=${encodeURIComponent(code)}`
    );
    const shortTokenData = await shortTokenRes.json();

    if (!shortTokenRes.ok) {
      console.error("Erro ao obter short-lived token:", shortTokenData);
      return NextResponse.redirect(
        new URL(
          "/dashboard?instagram_error=short_token_failed",
          req.url
        )
      );
    }

    const shortLivedToken = shortTokenData.access_token as string;

    // 2) Trocar o token de curta duração por um long-lived token
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
        appId
      )}&client_secret=${encodeURIComponent(
        appSecret
      )}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`
    );
    const longTokenData = await longTokenRes.json();

    if (!longTokenRes.ok) {
      console.error("Erro ao obter long-lived token:", longTokenData);
      return NextResponse.redirect(
        new URL(
          "/dashboard?instagram_error=long_token_failed",
          req.url
        )
      );
    }

    const longLivedToken = longTokenData.access_token as string;

    // 3) Obter as páginas do usuário e, a partir delas, o Instagram Business Account ID
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(
        longLivedToken
      )}`
    );
    const pagesData = await pagesRes.json();

    if (!pagesRes.ok || !Array.isArray(pagesData.data) || pagesData.data.length === 0) {
      console.error("Nenhuma página encontrada para o usuário:", pagesData);
      return NextResponse.redirect(
        new URL(
          "/dashboard?instagram_error=no_pages_found",
          req.url
        )
      );
    }

    const firstPage = pagesData.data[0] as {
      id: string;
      name: string;
      access_token: string;
    };

    // 4) Buscar o Instagram Business Account vinculado a essa página
    const igRes = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(
        firstPage.id
      )}?fields=instagram_business_account&access_token=${encodeURIComponent(
        firstPage.access_token
      )}`
    );
    const igData = await igRes.json();

    if (
      !igRes.ok ||
      !igData.instagram_business_account ||
      !igData.instagram_business_account.id
    ) {
      console.error(
        "Nenhuma conta do Instagram Business vinculada à página:",
        igData
      );
      return NextResponse.redirect(
        new URL(
          "/dashboard?instagram_error=no_instagram_business_account",
          req.url
        )
      );
    }

    const instagramBusinessAccountId = igData.instagram_business_account
      .id as string;

    // 5) Salvar de forma segura no Supabase na tabela user_instagram_accounts
    const { error: upsertError } = await supabaseServer
      .from("user_instagram_accounts")
      .upsert(
        {
          user_id: state,
          instagram_business_account_id: instagramBusinessAccountId,
          long_lived_token: longLivedToken,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Erro ao salvar dados no Supabase:", upsertError);
      return NextResponse.redirect(
        new URL(
          "/dashboard?instagram_error=supabase_upsert_failed",
          req.url
        )
      );
    }

    // 6) Redirecionar o usuário para a página de posts
    return NextResponse.redirect(new URL("/meus-posts", req.url));
  } catch (e) {
    console.error("Erro inesperado no callback da Meta:", e);
    return NextResponse.redirect(
      new URL(
        "/dashboard?instagram_error=unexpected_error",
        req.url
      )
    );
  }
}

