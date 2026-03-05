# Deploy do Sowish Sorteios na sua VPS com domínio próprio

Quando o app da Meta está **Ativo**, não aceita `localhost`. Use sua VPS e domínio.

---

## 1. O que você precisa

- **VPS** com Linux (Ubuntu 22.04 é um bom padrão)
- **Domínio** apontando para o IP da VPS (ex: `sowish.seudominio.com.br`)
- Acesso SSH à VPS

---

## 2. Na sua VPS – instalar Node.js e dependências

Conecte por SSH e rode:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node -v   # deve mostrar v20.x
npm -v
```

---

## 3. Enviar o projeto para a VPS

**Opção A – Git (recomendado)**

No seu PC, na pasta do projeto:

```bash
cd "C:\Users\PC\OneDrive\Área de Trabalho\Sorteios\sowish-sorteios"
git init
git add .
git commit -m "Deploy inicial"
# Crie um repositório no GitHub/GitLab e:
git remote add origin https://github.com/SEU_USUARIO/sowish-sorteios.git
git push -u origin main
```

Na VPS:

```bash
cd /var/www   # ou outra pasta de sua preferência
sudo git clone https://github.com/SEU_USUARIO/sowish-sorteios.git
cd sowish-sorteios
```

**Opção B – Enviar pasta por FTP/SFTP**

Use FileZilla ou WinSCP: envie toda a pasta `sowish-sorteios` (exceto `node_modules` e `.next`) para a VPS, por exemplo em `/var/www/sowish-sorteios`.

---

## 4. Arquivo `.env` na VPS

Na VPS, dentro da pasta do projeto:

```bash
cd /var/www/sowish-sorteios   # ajuste se usou outro caminho
nano .env.local
```

Cole o conteúdo (use **seu domínio** e suas chaves reais):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bumyouwsmmrqlxzomkrj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# Meta / Facebook (Instagram)
NEXT_PUBLIC_FACEBOOK_APP_ID=seu_app_id
FACEBOOK_APP_SECRET=seu_app_secret
NEXT_PUBLIC_FACEBOOK_REDIRECT_URI=https://SEU_DOMINIO.com.br/api/meta/callback
```

Salve (Ctrl+O, Enter, Ctrl+X no nano).

---

## 5. Build e rodar com PM2

Na VPS, na pasta do projeto:

```bash
npm install
npm run build
```

Instalar PM2 (mantém o app rodando e reinicia se cair):

```bash
sudo npm install -g pm2
pm2 start npm --name "sowish" -- start
pm2 save
pm2 startup   # segue a instrução que aparecer para iniciar no boot
```

O Next.js estará rodando na porta **3000** dentro da VPS.

---

## 6. Nginx como proxy reverso (e HTTPS)

Instale Nginx e Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Crie o site (troque `sowish.seudominio.com.br` pelo seu domínio):

```bash
sudo nano /etc/nginx/sites-available/sowish
```

Cole (ajuste o `server_name` e o caminho se precisar):

```nginx
server {
    listen 80;
    server_name sowish.seudominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site e teste:

```bash
sudo ln -s /etc/nginx/sites-available/sowish /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Depois pegue o certificado HTTPS (responda às perguntas; use o e-mail que quiser):

```bash
sudo certbot --nginx -d sowish.seudominio.com.br
```

O Certbot vai ajustar o Nginx para usar HTTPS automaticamente.

---

## 7. Configurar domínio no Supabase

1. Painel Supabase → **Authentication** → **URL Configuration**.
2. Em **Site URL**, coloque: `https://sowish.seudominio.com.br`
3. Em **Redirect URLs**, adicione:
   - `https://sowish.seudominio.com.br`
   - `https://sowish.seudominio.com.br/dashboard`
   - `https://sowish.seudominio.com.br/api/meta/callback`
4. Salve.

---

## 8. Configurar domínio no app da Meta (Facebook)

1. [developers.facebook.com](https://developers.facebook.com) → seu app → **Facebook Login** → **Settings**.
2. Em **Valid OAuth Redirect URIs**, adicione:
   - `https://sowish.seudominio.com.br/api/meta/callback`
3. Em **App Domains** (se existir), coloque: `seudominio.com.br`
4. Salve.

Assim o “Conectar meu Instagram” vai usar a URL do seu domínio e o erro de “URL bloqueada” some.

---

## 9. Resumo rápido

| Onde              | O que fazer |
|-------------------|-------------|
| VPS               | Node 20, clone do projeto, `.env.local`, `npm install`, `npm run build`, PM2 |
| Nginx             | Proxy para `http://127.0.0.1:3000`, `server_name` = seu domínio |
| Certbot           | HTTPS para o domínio |
| Supabase          | Site URL e Redirect URLs com `https://seu-dominio` |
| Meta (Facebook)   | Valid OAuth Redirect URI = `https://seu-dominio/api/meta/callback` |

Depois de tudo isso, acesse `https://sowish.seudominio.com.br` e teste o login e o “Conectar meu Instagram”.
