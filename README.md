# Painel do Veículo — v10

4 arquivos: `index.html`, `sw.js`, `manifest.json`, `README.md`.

## Sobre renomear os arquivos (`index-v9`, etc.)

Preciso ser direto aqui porque é importante: **não posso renomear o
`index.html`** — o GitHub Pages exige esse nome exato, na raiz do
repositório, pra saber qual arquivo abrir quando alguém entra no seu site.
Se ele virasse `index-v9.html`, o link do seu app pararia de abrir sozinho.

Em vez disso, fiz o equivalente que resolve a mesma preocupação (confirmar
que a versão certa está no ar): agora tem um **numerozinho de versão** bem
embaixo da tela de Configurações (ex: "Painel do Veículo v10"). Depois de
subir os arquivos, é só abrir Configurações e conferir se bateu com a versão
que eu te mandar. Já o auto-update (da v7) continua garantindo que o
navegador sempre puxa a versão mais nova sozinho.

Se o "conflito de arquivo" que você lembra era o GitHub perguntando
"substituir arquivo existente?" ao subir de novo — isso é normal, é só
confirmar que sim.

## Outras correções desta versão

- **Modo claro mais definido:** bordas mais firmes, texto com mais
  contraste, e sombras nos cartões e nas telas de edição (antes ficavam
  "achatadas" sem profundidade no fundo branco).
- **Deslizar entre as abas:** agora dá pra arrastar o dedo pra esquerda/
  direita na tela do Painel/Abastecer/Óleo/Pneus/Histórico pra trocar de
  aba, além de tocar nos ícones de baixo.

## Como colocar no ar
1. GitHub → **Add file → Upload files** → os 4 arquivos juntos, na raiz do
   repositório → **Commit changes** (confirma substituir os existentes).
2. Espera 1-2 minutos. Confere a versão em Configurações.

## Importante
- Login padrão: usuário `Fabrício`, senha `4209`.
- Dados salvos só no navegador/aparelho (localStorage); use o Backup em
  Configurações para copiar/transferir.
