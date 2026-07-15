# Painel do Veículo — v9

4 arquivos: `index.html`, `sw.js`, `manifest.json`, `README.md`.

## Nesta versão

1. **Backup (exportar/importar).** Em Configurações, logo no topo, tem o
   cartão **"Backup"**:
   - **Exportar** baixa um arquivo (`painel-veiculo-backup-AAAA-MM-DD.json`)
     com todos os veículos, histórico e usuários — vai para a pasta Downloads
     do celular, do jeito que você pediu (um arquivo que fica salvo no
     aparelho).
   - **Importar** deixa você escolher esse arquivo de volta e substitui todos
     os dados atuais por ele (pede confirmação antes, porque apaga o que
     estiver ali).
   - Importante: como o app não tem nuvem, isso só transfere dados entre
     aparelhos se você exportar de um e importar no outro manualmente — não
     existe "dado guardado na internet" esperando para ser puxado.

2. **Ajustar nível de combustível manualmente.** No Painel, embaixo do
   velocímetro, tem um campo novo "Ajustar nível de combustível" — coloca a
   quantidade certa de litros que tem no tanque agora e toca OK. O
   velocímetro passa a considerar esse valor como referência (em vez de só
   calcular a partir do último abastecimento).

## Sobre o que ainda não fiz (preciso confirmar com você)

- **Editar Óleo/Pneus "não está editando nada":** revisei o código de novo,
  não achei nada de errado nele — o lápis deveria abrir a tela de edição
  normalmente. Pode ser que você tenha testado numa versão de antes desta
  (v8 ou anterior). Testa de novo nesta v9 e me fala exatamente o que
  acontece quando toca no lápis (nada abre? abre mas não salva? dá erro?).

- **Arrastar/deslizar entre abas (Painel → Abastecer → Óleo...):** entendi
  que você quer trocar de aba deslizando o dedo pros lados, não só tocando.
  Isso dá pra fazer, mas é uma mudança grande o suficiente que prefiro
  confirmar com você antes de mexer, pra não synchronize errado com o resto.

- **Nomes de arquivo em sucessão (tipo `index-v9`):** eu ainda não mudei isso
  porque, se eu renomear o `index.html`, o GitHub Pages **para de abrir o
  site sozinho** (ele precisa se chamar exatamente `index.html` na raiz pra
  funcionar como página inicial). O nome do zip já muda a cada versão
  (`painel-veiculo-v9.zip`) — se o problema é o GitHub perguntar "substituir
  arquivo existente?" ao subir de novo, isso é normal e o correto é
  confirmar a substituição. Me conta com mais detalhe que tipo de "conflito"
  você viu, que daí eu resolvo certo.

## Como colocar no ar
1. GitHub → **Add file → Upload files** → os 4 arquivos juntos, na raiz do
   repositório → **Commit changes** (confirma substituir os arquivos
   existentes).
2. Espera 1-2 minutos. O app se atualiza sozinho.

## Importante
- Login padrão: usuário `Fabrício`, senha `4209`.
- Dados continuam salvos só no navegador/aparelho (localStorage) — o backup
  em arquivo agora é a forma de tirar uma cópia de segurança ou levar pra
  outro aparelho.
