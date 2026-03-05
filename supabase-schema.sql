-- ============================================================
-- Sowish Sorteios - Schema do Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- (Dashboard Supabase → SQL Editor → New query → Cole e rode)
-- ============================================================

-- 1) Tabela de perfis (conta do usuário: nome, avatar, role admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  role text DEFAULT NULL
);

-- 2) Créditos por usuário (1 crédito = 1 sorteio)
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  saldo_creditos integer NOT NULL DEFAULT 0
);

-- 3) Contas do Instagram vinculadas (uma por usuário)
CREATE TABLE IF NOT EXISTS public.user_instagram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_business_account_id text NOT NULL,
  long_lived_token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 4) Comunicados globais (admin envia; dashboard exibe)
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Índices para buscas comuns
CREATE INDEX IF NOT EXISTS idx_user_instagram_user_id ON public.user_instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active) WHERE is_active = true;

-- ============================================================
-- Trigger: criar perfil automaticamente quando um usuário se cadastrar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS (Row Level Security) – usuários só acessam seus dados
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário vê e atualiza só o próprio perfil
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User credits: usuário vê só os próprios créditos
DROP POLICY IF EXISTS "Users can read own credits" ON public.user_credits;
CREATE POLICY "Users can read own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- User Instagram: usuário vê só a própria vinculação (a API usa service role e ignora RLS)
DROP POLICY IF EXISTS "Users can read own instagram" ON public.user_instagram_accounts;
CREATE POLICY "Users can read own instagram" ON public.user_instagram_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Announcements: qualquer usuário autenticado pode ler comunicados ativos
DROP POLICY IF EXISTS "Authenticated can read active announcements" ON public.announcements;
CREATE POLICY "Authenticated can read active announcements" ON public.announcements
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- As APIs do app usam SERVICE_ROLE_KEY e ignoram RLS para escrever em todas as tabelas.
-- Para INSERT/UPDATE/DELETE via service role funcionar, não criamos políticas de escrita
-- para o cliente; o backend faz as escritas.

-- ============================================================
-- Storage: bucket para fotos de perfil (avatars)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Qualquer usuário autenticado pode fazer upload no bucket avatars (foto de perfil)
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- ============================================================
-- BACKFILL: criar perfil e créditos para usuários que JÁ EXISTIAM
-- (quem se cadastrou antes das tabelas existirem não ganhou linha no trigger)
-- Rode isto após o schema; pode rodar de novo sem problema.
-- ============================================================
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_credits (user_id, saldo_creditos)
SELECT id, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- Tornar um usuário ADMIN (rode trocando o e-mail pelo do usuário):
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com');
-- ============================================================
