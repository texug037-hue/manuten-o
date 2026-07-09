# Painel do Veículo — projeto pronto para publicar

App completo de controle de combustível, quilometragem, óleo e pneus, com:
- Login/cadastro por e-mail, com olhinho de mostrar senha e "manter conectado"
- Cadastro só com e-mail → a pessoa recebe um e-mail para criar a própria senha
- Papéis de usuário: **administrador** e **público** (só administrador troca o papel de alguém)
- Trocar a própria senha dentro do app (Configurações → Conta)
- Trava opcional de biometria (digital / Face ID / desbloqueio de tela) para abrir o app
- Dados salvos no Firestore (nuvem) com cópia local automática — funciona offline e sincroniza sozinho
- Ícone do app já pronto, manifest e service worker prontos para instalação
- Camadas de segurança: regras do Firestore restritivas, App Check, cabeçalhos HTTP de proteção,
  chaves fora do código-fonte, bloqueio progressivo contra tentativas repetidas de login

Ele **não roda dentro do chat** — precisa ser publicado (deploy) para virar um app de verdade.
Abaixo está o passo a passo, do jeito mais simples possível.

---

## 1. Configurar o Firebase (uma vez só)

### 1.1 Chaves do projeto
No Firebase Console → ⚙️ Configurações do projeto → "Seus apps" → se não tiver um app Web ainda,
clique **Adicionar app → Web** (ícone `</>`) → copie os valores do objeto `firebaseConfig`.

Copie o arquivo `.env.example` para um novo arquivo chamado `.env` (mesma pasta) e cole os valores:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

⚠️ O arquivo `.env` **nunca** vai para o GitHub (já está no `.gitignore`). O `.env.example` pode ser
commitado normalmente — não tem nenhum valor real.

### 1.2 Ativar login por e-mail/senha
Firebase Console → **Authentication** → aba **Sign-in method** → ative **E-mail/senha**.

Em **Authentication → Settings → User actions**, ative **"Enumeration protection"** se disponível
na sua região — isso evita que alguém descubra quais e-mails têm conta só tentando logar.

### 1.3 Criar o banco (Firestore)
Firebase Console → **Firestore Database** → **Criar banco de dados** → modo produção.

Crie manualmente UM documento (só uma vez):
- Coleção: `meta` → Documento: `adminBootstrap` → campo `claimed` (boolean) = `false`

Isso faz a **primeira pessoa a se cadastrar virar administrador automaticamente**.

### 1.4 Colar as regras de segurança
Firebase Console → **Firestore Database** → aba **Regras** → apague tudo → cole o conteúdo de
`firestore.rules` (raiz do projeto) → **Publicar**.

Essas regras já vêm endurecidas: cada pessoa só lê/escreve os próprios dados, ninguém consegue
se autopromover a administrador depois do primeiro cadastro, campos fora da lista esperada são
rejeitados, e qualquer caminho não previsto é bloqueado por padrão.

### 1.5 (Recomendado) Ativar o App Check
App Check confirma que as requisições vêm mesmo do seu app publicado, não de um script tentando
acessar o banco direto.

Firebase Console → **App Check** → registre seu app Web com **reCAPTCHA v3** → copie a "site key"
→ cole em `VITE_RECAPTCHA_SITE_KEY` no `.env`. Depois, na mesma tela, ative **modo de aplicação
(enforced)** para Firestore e Authentication — só faça isso depois que o app estiver publicado e
funcionando, para não travar seu próprio acesso por engano durante o teste.

## 2. Criar sua conta de administrador

Depois de publicado (passo 4), abra o app e cadastre-se normalmente com o e-mail
`t.e.x.u.g.o@hotmail.com`, escolhendo uma senha de verdade (mínimo 6 caracteres — o Firebase não
aceita menos que isso, é uma trava de segurança do próprio sistema, não dá para usar algo como
"4209"). Por ser a primeira conta criada no projeto, ela vira **administrador** sozinha.

Se quiser trocar a senha depois, é só entrar no app → ⚙️ Configurações → Conta → **Trocar senha**.

## 3. Instalar as dependências e gerar o build

Com [Node.js](https://nodejs.org) instalado, dentro da pasta do projeto:

```bash
npm install
npm run build
```

## 4. Publicar no Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
```

Abra `.firebaserc` e troque `COLE_O_ID_DO_SEU_PROJETO_AQUI` pelo ID do seu projeto Firebase
(aparece no Console, ao lado do nome do projeto).

```bash
firebase deploy
```

Ao final ele mostra o link (`https://seu-projeto.web.app`). Abra no celular — o navegador oferece
**"Adicionar à tela inicial" / "Instalar app"** sozinho, com o ícone que você mandou.

---

## Subindo para o GitHub

O projeto já vem pronto para isso:
- `.gitignore` já exclui `node_modules/`, `dist/`, `.env` e arquivos internos do Firebase
- Nenhuma chave ou senha fica escrita no código — tudo vem do `.env` (que não é commitado)

```bash
git init
git add .
git commit -m "Painel do veículo"
git branch -M main
git remote add origin <link-do-seu-repositorio>
git push -u origin main
```

Se o repositório for público, tudo bem — não há nenhum segredo no código. Só confirme que o
arquivo `.env` realmente não aparece em `git status` antes do primeiro commit.

---

## Camadas de segurança incluídas

- **Chaves fora do código**: Firebase config vem de variáveis de ambiente, não hardcoded
- **Regras do Firestore restritivas**: cada usuário só acessa seus próprios dados; campos
  fora da lista esperada são rejeitados; ninguém edita o próprio "role"; deny-all explícito
  para qualquer caminho não previsto
- **App Check** (opcional, recomendado): bloqueia tráfego que não vem do app real
- **Cabeçalhos HTTP** (`firebase.json`): Content-Security-Policy, X-Frame-Options (anti-clickjacking),
  X-Content-Type-Options, Strict-Transport-Security (força HTTPS), Referrer-Policy
- **Bloqueio progressivo de login**: depois de 3 tentativas erradas seguidas, o próprio navegador
  passa a esperar um tempo crescente (10s, 20s, 40s...) antes de deixar tentar de novo — além do
  limite que o Firebase já aplica no servidor
- **Reautenticação para trocar senha**: exige a senha atual antes de definir uma nova
- **Biometria como conveniência, não como autenticação primária**: quem mantém a sessão seguro é
  o Firebase Auth; a biometria só evita digitar a senha de novo no mesmo aparelho

Nenhum sistema é 100% inviolável — isso cobre as práticas padrão de mercado para esse tipo de app.
Duas coisas ficam por sua conta e são igualmente importantes: nunca compartilhar o `.env` com
ninguém, e manter o e-mail/senha da conta administradora só com você.

## Sobre a biometria

Usa WebAuthn (tecnologia nativa do navegador, mesma por trás do desbloqueio por digital/Face ID).
É uma **trava de conveniência**: o Firebase, com "manter conectado" ligado, é quem de fato mantém
você autenticado; a biometria só confirma que é você antes de abrir os dados. Ativa-se uma vez por
aparelho, em Configurações → Conta.

## Estrutura do projeto

```
src/
  dashboard.jsx   → o painel (combustível, óleo, pneus, histórico, configurações, trocar senha)
  auth.jsx        → login, cadastro, "esqueci minha senha", bloqueio progressivo
  roles.jsx       → gerenciar usuários (só administradores)
  webauthn.js     → biometria (trava de conveniência)
  firebase.js     → inicialização do Firebase + App Check (lê as chaves do .env)
  main.jsx        → conecta autenticação, dados do Firestore e o painel
public/
  manifest.json, service-worker.js, icons/
firestore.rules       → regras de segurança (colar no passo 1.4)
firebase.json          → hosting + cabeçalhos de segurança
.env.example            → modelo das variáveis de ambiente (copiar para .env)
.gitignore               → protege .env, node_modules e dist do GitHub
```
