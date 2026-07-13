# Painel do Veículo — v3

Novidades desta versão:

- **Velocímetro de combustível redesenhado**: arco em segmentos estilo esportivo
  (270°), com marcações de porcentagem no painel inteiro (0%, 25%, 50%, 75%, 100%
  + tracinhos a cada 10%), marcador vermelho na reserva (últimos 3 L), cores por
  zona (vermelho na reserva → amarelo até 1/4 do tanque → verde daí até o cheio),
  litragem centralizada no meio do velocímetro, e o ícone da bomba de combustível
  no canto do card muda de cor acompanhando o nível atual.
- **Botão de tema claro/escuro corrigido**: antes só as cores internas mudavam e
  o fundo da página ficava sempre escuro; agora o fundo inteiro (inclusive fora
  do cartão) acompanha o tema escolhido.
- **Histórico de abastecimentos**: o botão de excluir (X) virou um botão de
  **editar** (lápis). Ao tocar, abre uma tela para corrigir data, quilometragem,
  litros, preço por litro e se completou o tanque — e também dá pra excluir o
  registro por ali, com um botão separado dentro da edição.
- Correção interna: editar ou excluir um abastecimento agora recalcula
  corretamente o consumo e o nível do tanque de todos os registros seguintes,
  então a sequência do histórico não fica inconsistente depois de um ajuste.

## Como colocar no ar
1. No repositório do GitHub: **Add file → Upload files** → arrasta `index.html`
   **e `sw.js`** juntos, na raiz do repositório → **Commit changes**.
2. Espera 1-2 minutos e recarrega (se não atualizar, force um refresh:
   Ctrl+Shift+R, ou desinstale e reinstale o app pelo botão "Instalar aplicativo").

## Importante
- Login: usuário `Fabrício`, senha `4209` (continua sendo uma tranca de
  conveniência local, não uma autenticação de servidor).
- Dados continuam salvos só no navegador/aparelho (localStorage), sem nuvem.
