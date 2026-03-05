-- ============================================================
-- BACKFILL: preencher profiles e user_credits para usuários existentes
-- Use quando: você já rodou o supabase-schema.sql mas quem logou
-- antes disso não tem linha em profiles nem user_credits.
--
-- No Supabase: SQL Editor → New query → cole isto → Run
-- Pode rodar mais de uma vez (é seguro).
-- ============================================================

-- Criar perfil para todo mundo que está em auth.users e ainda não tem em profiles
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Criar linha de créditos (0) para todo mundo que ainda não tem
INSERT INTO public.user_credits (user_id, saldo_creditos)
SELECT id, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;
