# Painel do Veículo — v4

Novidades desta versão:

- **Velocímetro:** ajustado o tamanho e o espaçamento das marcações (0%, 25%,
  50%, 75%, 100%) para não ficarem mais atrás do número de litros.
- **Tema claro/escuro:** agora troca de verdade, incluindo o fundo da página
  inteira (antes só os cartões mudavam).
- **App sempre atualizado:** o service worker (`sw.js`) agora busca a versão
  mais nova direto da internet sempre que possível, e só usa a cópia salva no
  aparelho quando está offline. Isso evita o app "travar" numa versão antiga
  depois de eu te mandar uma atualização.
- **Login com múltiplos usuários:**
  - Em Configurações agora tem **"Cadastrar usuário"**, dentro da tela de
    gerenciamento de usuários (visível só para administradores).
  - Qualquer usuário pode **trocar a própria senha** a qualquer momento.
  - O administrador (você, Fabrício) tem uma tela **"Gerenciar usuários"** que
    mostra todos os usuários cadastrados com a senha de cada um, e pode editar
    ou excluir qualquer um deles quando quiser.
  - Tirado o botão "Bloquear aplicativo" de dentro de Configurações.
- **Sair do app:** agora tem um ícone de saída ao lado do "Histórico", na
  barra de baixo — mais rápido para bloquear o app sem entrar em Configurações.
- **Corrigido:** atualizar a quilometragem atual (aquele campo "Atualizar
  quilometragem atual" no Painel) agora realmente desconta combustível do
  velocímetro entre abastecimentos — antes, sem pelo menos 2 abastecimentos
  registrados, o app não sabia estimar consumo e não descontava nada. Agora,
  enquanto não há histórico suficiente, ele usa uma média de referência
  (12 km/L carro, 25 km/L moto) até ter dados reais do seu veículo.

## Como colocar no ar
1. No repositório do GitHub: **Add file → Upload files** → arrasta `index.html`
   **e `sw.js`** juntos, na raiz do repositório → **Commit changes**.
2. Espera 1-2 minutos e recarrega. Como o service worker agora busca a versão
   mais nova primeiro, não deve precisar mais forçar refresh manualmente.

## Importante
- Login padrão: usuário `Fabrício`, senha `4209` (continua sendo uma tranca
  de conveniência local, sem servidor — qualquer usuário cadastrado consegue
  ver a própria senha, e o admin vê a de todo mundo, porque tudo fica salvo
  só no aparelho).
- Dados continuam salvos só no navegador/aparelho (localStorage), sem nuvem.
