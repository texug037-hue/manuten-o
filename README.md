# Painel do Veículo — v8

4 arquivos: `index.html`, `sw.js`, `manifest.json`, `README.md`.

## Nesta versão

1. **Óleo e Pneus agora têm edição.** No histórico de cada aba (Óleo e
   Pneus), toque no lápis ao lado de qualquer registro para corrigir data,
   quilometragem ou intervalo — e também dá pra excluir por ali.

2. **Tirei o botão de digital da tela de login**, já que não funcionou no seu
   aparelho. A opção continua existindo em Configurações (caso um dia queira
   tentar de novo), mas não aparece mais na tela inicial.

3. **"Sair" agora pede confirmação.** Antes de derrubar a sessão, aparece uma
   pergunta "Sair do aplicativo?". Minha aposta é que o incômodo de "ele
   apaga os dados quando eu saio" era, na real, o botão "Sair" sendo tocado
   sem querer (ele fica bem colado nos outros ícones) — e "Sair" sempre vai
   pedir login de novo na volta, isso é esperado e por segurança. Já
   "Manter login salvo" controla é se o app pede login sozinho quando você
   só *reabre* o app (sem ter tocado em Sair) — essas são duas coisas
   diferentes.

## Ainda pendente (preciso da sua confirmação)
Você mencionou "as duas últimas" mas eu tinha te perguntado 3 coisas — não
ficou claro se a de **exportar/importar backup** (opção 1 da vez passada)
entra ou não. Se quiser, é só confirmar e eu incluo na próxima versão.

## Como colocar no ar
1. GitHub → **Add file → Upload files** → os 4 arquivos juntos, na raiz do
   repositório → **Commit changes**.
2. Espera 1-2 minutos. O app deve se atualizar sozinho a partir de agora.

## Importante
- Login padrão: usuário `Fabrício`, senha `4209`.
- Dados continuam salvos só no navegador/aparelho (localStorage), sem nuvem.
