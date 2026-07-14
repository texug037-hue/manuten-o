# Painel do Veículo — v5

Correções desta versão:

- **Velocímetro:** os segmentos (aquele estilo "LED" com tracinhos separados)
  agora são maiores, com espaço bem mais visível entre eles e pontas retas
  (em vez de arredondadas) — para não parecer mais um arco liso como antes.
  Também tirei o anel de fundo contínuo; agora até a parte "apagada" é feita
  dos mesmos tracinhos, só que na cor cinza.
- **Botão "Sair":** estava malposicionado (aparecendo solto no meio do
  conteúdo, "comendo" espaço). Agora ele fica corretamente dentro da barra de
  baixo, separado dos outros ícones por uma linha divisória, com largura fixa
  própria — não aperta mais o Painel/Abastecer/Óleo/Pneus/Histórico.

Como não tenho como abrir o app num navegador daqui pra conferir visualmente,
testei a sintaxe do código todo (sem erros), mas conto com você pra confirmar
se ficou do jeito certo depois de instalar essa versão.

## Como colocar no ar
1. No repositório do GitHub: **Add file → Upload files** → arrasta `index.html`
   **e `sw.js`** juntos, na raiz do repositório → **Commit changes**.
2. Espera 1-2 minutos e recarrega (o app já busca a versão mais nova sozinho).

## Importante
- Login padrão: usuário `Fabrício`, senha `4209`.
- Dados continuam salvos só no navegador/aparelho (localStorage), sem nuvem.
