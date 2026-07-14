# Painel do Veículo — v6

⚠️ **Esta versão tem 4 arquivos agora** (antes eram 3) — precisa subir todos
juntos, na raiz do repositório: `index.html`, `sw.js`, `manifest.json` e este
`README.md`.

## O que mudou nesta versão

- **Reserva agora é 5 litros** (era 3L) — o aviso de "combustível ficando
  baixo" e a faixa vermelha do velocímetro passam a considerar os últimos 5L
  do tanque.

- **Tema claro/escuro:** revisei tudo de novo e apliquei um reforço — agora,
  ao trocar o tema, o painel inteiro é remontado do zero (não só repintado),
  o que garante que absolutamente nenhum elemento fique preso na cor antiga.

- **Instalar como app de verdade:** essa era a causa raiz de o app "ficar
  salvo como Chrome" — o manifesto do PWA estava embutido dentro do próprio
  `index.html` como um texto codificado, e alguns celulares/navegadores não
  processam isso direito para gerar um app instalável de verdade. Agora o
  manifesto é um **arquivo separado** (`manifest.json`), do jeito que
  Android/iPhone esperam, com os ícones nos tamanhos certos (incluindo um
  ícone "maskable" pro Android). Também adicionei uma **faixa no topo da
  tela** oferecendo "Instalar" assim que o navegador permitir — não precisa
  mais só confiar no botão dentro da tela de login.

- **Lembrar login:** conferi de novo toda a lógica de salvar/ler o usuário
  logado — está consistente. Se ainda assim pedir login de novo depois de
  marcar "Manter login salvo", me avisa se isso acontece logo de cara (na
  próxima vez que abrir) ou só depois de um tempo/reinício do celular, porque
  isso ajuda a apontar exatamente onde está o problema.

Sendo transparente: eu não tenho como abrir o app num navegador daqui para
testar visualmente — só revejo e testo a sintaxe do código. Testei a sintaxe
inteira agora (sem erros), mas depende de você confirmar com prints se tudo
realmente ficou certo desta vez.

## Como colocar no ar
1. No GitHub: **Add file → Upload files** → arrasta os **4 arquivos**
   (`index.html`, `sw.js`, `manifest.json`, `README.md`) juntos, na raiz do
   repositório → **Commit changes**.
2. Espera 1-2 minutos e recarrega a página.
3. Para testar a instalação como app: abre o link no celular e vê se aparece
   a faixa "Instalar" no topo, ou usa o botão na tela de login.

## Importante
- Login padrão: usuário `Fabrício`, senha `4209`.
- Dados continuam salvos só no navegador/aparelho (localStorage), sem nuvem.
