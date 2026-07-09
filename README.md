# Painel do Veículo — versão em arquivo único

Este projeto é **um único arquivo**: `index.html`. Não tem pasta `src`, não tem `node_modules`,
não precisa de `npm install` nem de build — o app inteiro (código, estilo, ícones) está dentro
desse arquivo, e o navegador carrega React e Firebase direto de uma CDN na hora que a página abre.

Só duas coisas ficam fora dele, e não tem como evitar:
- `firestore.rules`, `firebase.json`, `.firebaserc`, `firestore.indexes.json` — arquivos de
  configuração que o Firebase exige com esse nome exato, na raiz do projeto (não são "pastas",
  são só arquivos ao lado do `index.html`)
- `.github/workflows/deploy.yml` — essa pasta específica é uma exigência do próprio GitHub para
  reconhecer automações (GitHub Actions); não existe forma de driver isso sem esse caminho exato

Fora essas exceções obrigatórias, é tudo um arquivo só.

---

## 1. Configurar o Firebase (uma vez só)

### 1.1 Ativar login por e-mail/senha
Firebase Console → **Authentication** → aba **Sign-in method** → ative **E-mail/senha**.

### 1.2 Criar o banco (Firestore)
Firebase Console → **Firestore Database** → **Criar banco de dados** → modo produção.

Crie manualmente UM documento (só uma vez):
- Coleção: `meta` → Documento: `adminBootstrap` → campo `claimed` (boolean) = `false`

Isso faz a **primeira pessoa a se cadastrar virar administrador automaticamente**.

### 1.3 Colar as regras de segurança
Firebase Console → **Firestore Database** → aba **Regras** → apague tudo → cole o conteúdo de
`firestore.rules` (raiz do projeto) → **Publicar**.

---

## 2. Criar sua conta de administrador

Depois de publicado (próximo passo), abra o app e cadastre-se com o e-mail
`t.e.x.u.g.o@hotmail.com`, escolhendo uma senha de verdade (mínimo 6 caracteres — é o limite do
próprio Firebase, não dá pra usar menos que isso). Por ser a primeira conta criada, ela vira
**administrador** sozinha.

---

## 3. Publicar — automático, direto do GitHub (sem terminal)

O arquivo `.github/workflows/deploy.yml` já vem pronto para publicar sozinho toda vez que o
repositório mudar. Só precisa fazer isto, uma única vez, tudo pelo navegador:

**3.1 — Autorizar o GitHub a publicar no seu Firebase**

Firebase Console → ⚙️ Configurações do projeto → aba **Contas de serviço** →
**Gerar nova chave privada** → confirma e baixa um arquivo `.json`. Abra esse arquivo num editor
de texto, copie TODO o conteúdo.

**3.2 — Colar essa chave como um "Secret" no GitHub**

No repositório: aba **Settings** → menu da esquerda **Secrets and variables → Actions** →
**New repository secret** → nome: `FIREBASE_SERVICE_ACCOUNT` → cole o conteúdo do JSON como valor
→ salvar.

**3.3 — Pronto**

A partir daqui, qualquer atualização no repositório publica sozinha. Acompanhe em **Actions** (aba
do repositório): bolinha verde quando terminar, vermelha se der erro (clique nela para ver a
mensagem exata).

O link final fica algo como `https://manutencao-57663.web.app` — abra no celular e o navegador
oferece **"Adicionar à tela inicial" / "Instalar app"** sozinho.

---

## Sobre esta versão (o que muda em relação à versão com build)

- **Vantagem**: um arquivo só, sem `npm install`, sem pasta que possa ficar bagunçada num upload
  manual pelo site do GitHub.
- **Trade-off 1**: sem service worker — o app não guarda o "esqueleto" da página para abrir 100%
  offline sem nenhuma internet. Os dados salvos (combustível, óleo, pneus) continuam funcionando
  offline normalmente, porque isso é feito pelo próprio Firestore, não pelo service worker.
- **Trade-off 2**: React, ícones e Firebase são baixados de uma CDN (esm.sh) toda vez que alguém
  abre o app pela primeira vez naquele aparelho; depois disso o navegador guarda em cache sozinho.
- **Trade-off 3**: sem cabeçalho de Content-Security-Policy super restritivo dessa vez, porque ele
  precisaria ser ajustado especificamente para liberar essa CDN — os outros cabeçalhos de segurança
  (X-Frame-Options, HSTS, nosniff, Referrer-Policy) continuam ativos.

Se um dia quiser voltar para a versão com build (mais rápida de carregar, funciona 100% offline,
CSP mais fechado), é só pedir — os dois formatos continuam válidos com o mesmo Firebase.

## Sobre a biometria

Trava de conveniência (WebAuthn) para abrir o app com digital/Face ID/desbloqueio de tela, sem
digitar a senha de novo no mesmo aparelho. Quem mantém a sessão seguro de verdade é o Firebase
Auth. Ativa-se em Configurações → Conta, dentro do app.
