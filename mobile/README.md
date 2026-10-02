# Meus Gastos — App Mobile (React Native / Expo)

Versão mobile do contador de gastos. Roda **100% local no celular** — banco SQLite embutido no app, sem depender de servidor nenhum ligado. Pensado especificamente pra não depender do notebook ficar ligado o tempo todo.

## Funcionalidades

- **Home** — dashboard com total da semana/mês, variação vs. mês anterior, média diária, gráfico dos últimos 6 meses (gasto x previsto), gráfico de rosquinha por categoria, comparação gasto vs. salário, maior gasto do mês e assinaturas ativas (com cancelar).
- **Histórico** — alternância entre visão Semana e Mês (calendário), com busca por nome/categoria e filtro por categoria.
- **Criar** — lançar um gasto com data escolhível (calendário nativo), valor com máscara monetária, categoria e opção de marcar como assinatura recorrente (repete todo mês automaticamente até cancelar).
- **Mais** — criar, editar e apagar categorias; exportar todos os lançamentos em CSV (compartilhável).
- **Eu** — trocar senha, código de recuperação (gera um código único `XXXX-XXXX` pra redefinir a senha sem precisar de e-mail/SMS), salário mensal (ocultável), limite diário de gastos (avisa com um toast quando ultrapassa, sem bloquear), alternância de tema claro/escuro.
- Conta local simples (usuário + senha), sem conexão com servidor externo.
- Atualizações via **EAS Update** (OTA) para mudanças de JS, sem precisar reinstalar o app.

## Stack

- **Expo** (React Native) + TypeScript
- **expo-sqlite** — banco local
- **expo-crypto** — hash de senha/código de recuperação
- **expo-sharing** + **expo-file-system** — exportação de CSV
- **@react-native-async-storage/async-storage** — sessão e preferência de tema
- **@react-native-community/datetimepicker** — seletor de data nativo
- **@react-native-picker/picker** — seletor de categoria
- **@expo/vector-icons** — ícones da navegação
- **react-native-svg** — gráfico de rosquinha

## Como rodar

```bash
cd mobile
npm install
npx expo start
```

Escaneie o QR code com o app **Expo Go** (Android/iOS), ou rode num emulador Android (`npx expo start --android`) ou simulador iOS (precisa de Mac).

## Gerar APK / publicar atualização

Build completo (precisa toda vez que uma lib nativa nova é adicionada, ícone muda, etc):

```bash
npx eas-cli build --platform android --profile preview
```

Atualização OTA (JS/lógica/estilo — não precisa reinstalar o app):

```bash
npx eas-cli update --branch preview --message "descrição da mudança"
```

Ambos exigem conta Expo (gratuita) e o projeto já configurado (`eas.json`, `app.json`).

## Estrutura

```
App.tsx                 # navegação (barra inferior) e autenticação
src/
  db.ts                 # banco local (expo-sqlite) e toda a lógica de cálculo
  auth.ts                # conta local, login, código de recuperação
  assinaturas.ts         # lançamentos recorrentes
  categorias.ts          # categorias padrão e paleta de cores
  theme.tsx              # tema claro/escuro (contexto React)
  toast.tsx              # avisos temporários (atualização aplicada, limite diário)
  screens/               # Home, Histórico, Criar, Mais, Eu, Login
  components/            # gráfico de rosquinha, chip de categoria, modal de dia
```

## Changelog

- **Base do app**: estrutura inicial em React Native/Expo, banco local SQLite, abas Dashboard/Semana/Mês, conta local com login.
- **Categorias e assinaturas**: categorias com cor, edição de categoria por lançamento, assinaturas recorrentes com cancelamento.
- **Dashboard**: gráfico de barras (gasto x previsto) dos últimos 6 meses, gráfico de rosquinha por categoria, maior gasto do mês.
- **Categorias dinâmicas**: criar, editar e apagar categorias pelo app (antes eram fixas no código).
- **Salário e comparação**: campo de salário mensal (ocultável) e comparação com o gasto do mês no dashboard.
- **Busca e filtro**: busca por nome e filtro por categoria no histórico (semana e mês).
- **Exportar CSV**: exportação de todos os lançamentos, com compartilhamento nativo.
- **Nova navegação**: barra inferior com 5 abas (Home, Histórico, Criar, Mais, Eu) e ícones reais.
- **Tela Criar dedicada**: seletor de data nativo, lançamento com categoria e opção de assinatura num só lugar.
- **Tema claro/escuro**: alternância manual (sol/lua), paleta personalizada (passou por algumas iterações até fechar em tons inspirados no GitHub Dark/Light).
- **Limite diário de gastos**: configurável na aba Eu, com aviso (toast) ao ultrapassar — sem bloquear o lançamento.
- **Atualização via OTA**: aviso visual quando uma atualização é aplicada.
- **Identidade visual**: ícone próprio do app.
- **Segurança de distribuição**: removida a importação automática de dados de exemplo — o APK pode ser compartilhado sem vazar dados de quem o gerou.
- **Recuperação de senha séria**: pergunta secreta trocada por código de recuperação único (`XXXX-XXXX`), gerado na criação da conta e exibido uma única vez.
