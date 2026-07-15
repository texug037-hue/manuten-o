# Painel do Veículo — v7

4 arquivos: `index.html`, `sw.js`, `manifest.json`, `README.md` — sobe todos
juntos, na raiz do repositório.

## As 4 mudanças autorizadas

1. **Auto-atualização de verdade.** O app agora detecta sozinho quando existe
   uma versão nova e recarrega automaticamente para pegar ela — sem precisar
   limpar cache, desinstalar ou reinstalar. Essa era provavelmente a causa de
   várias correções anteriores (tema, velocímetro) parecerem "não pegar".

2. **Entrar com digital.** Depois de logar uma vez com usuário/senha, vá em
   **Configurações → Entrar com digital neste aparelho** e ative. Da próxima
   vez que sair, a tela de login mostra um botão **"Entrar com digital"** —
   usa a impressão digital ou reconhecimento facial do próprio celular, sem
   digitar nada. Isso só funciona se o navegador/aparelho suportar
   (a maioria dos Android e iPhone recentes suportam).

3. **Botão de instalar sempre visível.** Na tela de login, embaixo do botão
   "Entrar", agora sempre aparece uma caixinha sobre instalação — se o
   celular permitir instalar com um toque, o botão instala direto; se não
   (alguns navegadores só liberam isso depois de acessar o site mais de uma
   vez, ou pedem passo manual), ela mostra exatamente onde tocar no menu do
   navegador para instalar.

4. **Tema claro branco de verdade.** O fundo era um cinza bem clarinho
   (#F3F4F7); troquei para branco puro (#FFFFFF).

Testei a sintaxe do código inteiro (sem erros), mas — sendo direto de novo —
não tenho como abrir isso num navegador daqui pra ver a tela de verdade.
Ainda conto com print pra eu confirmar se pegou desta vez.

## Como colocar no ar
1. GitHub → **Add file → Upload files** → os 4 arquivos juntos, na raiz do
   repositório → **Commit changes**.
2. Espera 1-2 minutos, recarrega. Da próxima vez que eu mandar uma
   atualização, nem vai precisar recarregar manualmente — o app deve se
   atualizar sozinho.

## Importante
- Login padrão: usuário `Fabrício`, senha `4209`.
- A digital fica salva só nesse aparelho/navegador — se trocar de celular,
  precisa ativar de novo.
- Dados continuam salvos só no navegador/aparelho (localStorage), sem nuvem.
