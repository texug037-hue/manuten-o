# Painel do Veículo

App completo (combustível, quilometragem, óleo, pneus, login, papéis de usuário) — tudo dentro
de **um único arquivo**: `index.html`. Sem pasta, sem build, sem npm, sem GitHub Actions.

## Como colocar no ar (3 passos, só pelo navegador)

### 1. Subir os 2 arquivos no GitHub
No repositório: **Add file → Upload files** → arrasta `index.html` e `firestore.rules` →
**Commit changes**.

### 2. Ativar o GitHub Pages
- **Settings** (aba do repositório) → menu da esquerda → **Pages**
- Em "Source": **Deploy from a branch**
- Em "Branch": **main** e pasta **/ (root)** → **Save**
- Espera 1-2 minutos e recarrega essa página — vai aparecer o link do site, algo como:
  `https://texug037-hue.github.io/manuten-o/`

### 3. Configurar o Firebase (uma vez só)
- **Authentication** → Sign-in method → ativa **E-mail/senha**
- **Authentication** → Settings → Authorized domains → **Add domain** → cola
  `texug037-hue.github.io` (sem isso o login não funciona nesse endereço)
- **Firestore Database** → Criar banco → modo produção
- Cria manualmente 1 documento: coleção `meta`, documento `adminBootstrap`, campo `claimed`
  (boolean) = `false` — isso faz o primeiro cadastro virar administrador sozinho
- **Firestore Database** → aba Regras → apaga tudo → cola o conteúdo de `firestore.rules` →
  **Publicar**

Pronto. Abre o link do site, cadastra com `t.e.x.u.g.o@hotmail.com` (senha de verdade, mínimo 6
caracteres) — essa conta vira administrador automaticamente por ser a primeira.

## Se quiser atualizar o app depois
Edita ou substitui o `index.html` no GitHub → o GitHub Pages atualiza sozinho em 1-2 minutos,
sem precisar repetir nenhum dos passos acima.
