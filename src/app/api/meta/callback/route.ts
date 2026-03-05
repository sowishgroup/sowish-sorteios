import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

/** Base URL pública do app (evita redirect para 0.0.0.0 atrás de proxy). */
function getPublicBaseUrl(req: NextRequest): string {
  const envUrl = process.env.APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  if (host && !host.startsWith("0.0.0.0") && host !== "localhost") {
    return `${proto}://${host}`;
  }
  return "https://sorteio.sowishgroup.com";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // user_id passado no state
  const error = url.searchParams.get("error");
  const baseUrl = getPublicBaseUrl(req);

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?instagram_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?instagram_error=missing_code_or_state`
    );
  }

  try {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
    const appSecret = process.env.FACEBOOK_APP_SECRET!;
    // Mesmo redirect_uri que o usuário usou (origem da requisição), exigido pela Meta
    const redirectUri = `${baseUrl}/api/meta/callback`;

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
        `${baseUrl}/dashboard?instagram_error=short_token_failed`
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
        `${baseUrl}/dashboard?instagram_error=long_token_failed`
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
        `${baseUrl}/dashboard?instagram_error=no_pages_found`
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
        `${baseUrl}/dashboard?instagram_error=no_instagram_business_account`
      );
    }

    const instagramBusinessAccountId = igData.instagram_business_account
      .id as string;

    const supabaseServer = getSupabaseServer();

    // 5) Salvar no Supabase: select depois update ou insert (não depende de UNIQUE em user_id)
    const userId = String(state).trim();
    const { data: existing } = await supabaseServer
      .from("user_instagram_accounts")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabaseServer
        .from("user_instagram_accounts")
        .update({
          instagram_business_account_id: instagramBusinessAccountId,
          long_lived_token: longLivedToken,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Erro ao atualizar conta Instagram no Supabase:", updateError);
        return NextResponse.redirect(
          `${baseUrl}/dashboard?instagram_error=supabase_upsert_failed`
        );
      }
    } else {
      const { error: insertError } = await supabaseServer
        .from("user_instagram_accounts")
        .insert({
          user_id: userId,
          instagram_business_account_id: instagramBusinessAccountId,
          long_lived_token: longLivedToken,
        });

      if (insertError) {
        console.error("Erro ao inserir conta Instagram no Supabase:", insertError);
        return NextResponse.redirect(
          `${baseUrl}/dashboard?instagram_error=supabase_upsert_failed`
        );
      }
    }

    // Log para diagnóstico em produção (só início do id)
    console.log("[meta/callback] Instagram vinculado para user_id:", userId.slice(0, 8) + "...");

    // 6) Redirecionar o usuário para a página de posts
    return NextResponse.redirect(`${baseUrl}/meus-posts`);
  } catch (e) {
    console.error("Erro inesperado no callback da Meta:", e);
    return NextResponse.redirect(
      `${baseUrl}/dashboard?instagram_error=unexpected_error`
    );
  }
}

