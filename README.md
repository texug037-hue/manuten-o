# Painel do Veículo — v2

Novidades desta versão:
- **Tela de login** ao abrir o app — usuário: `Fabrício`, senha: `4209`
- Campo de senha com **olho** para mostrar/ocultar
- Checkbox **"Manter login salvo"** — se marcado, não pede login de novo no mesmo
  aparelho; se desmarcado, pede login toda vez que o navegador for reaberto
- Botão **"Instalar aplicativo"** na tela de login — instala o app direto na tela
  inicial do celular (no Android/Chrome abre o instalador nativo; no iPhone mostra
  a dica de "Compartilhar → Adicionar à Tela de Início", que é como a Apple exige)
- Botão **"Bloquear aplicativo"** dentro de Configurações, para sair e pedir login
  de novo quando quiser
- Corrigido: o nível do tanque agora usa a quantidade real de litros abastecidos,
  em vez de sempre assumir tanque cheio. Tem uma nova opção "Completei o tanque"
  no formulário de abastecimento — marque só quando encher o tanque de verdade.

⚠️ Importante sobre o login: como o app é 100% estático (sem servidor), esse
login funciona como uma tranca de conveniência — qualquer pessoa com acesso
técnico ao código do app consegue ver a senha nele. Não é uma segurança real
de banco/e-mail, é só para impedir que alguém pegue seu celular e mexa direto.

## Como colocar no ar
1. No repositório do GitHub: **Add file → Upload files** → arrasta o `index.html`
   **e também o `sw.js`** (os dois arquivos, na raiz do repositório) → **Commit changes**.
2. Se o Pages já estava configurado, não precisa mexer em mais nada — só espera
   1-2 minutos e recarrega a página (se não atualizar, force um refresh: Ctrl+Shift+R
   ou limpe o cache do navegador).
3. Para instalar como app: abre o link no celular, faz login e toca em
   "Instalar aplicativo".

## Importante
- Os dados continuam salvos só no navegador/aparelho (localStorage), sem nuvem.
- Para atualizar depois: substitui `index.html` (e `sw.js` se eu mexer nele) no
  GitHub — o Pages atualiza sozinho.
