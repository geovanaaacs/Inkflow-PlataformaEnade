# Inkflow — mobile

App do Inkflow em **React Native com Expo (SDK 58) + TypeScript**, usando a mesma API do site (`backend/`).

## Rodando no celular

1. Suba a API na raiz do monorepo (`npm run dev` ou `npm run dev:api`).
2. Instale o app **Expo Go** no celular (Play Store ou App Store).
3. Nesta pasta:

   ```powershell
   cd mobile
   npm install
   npx expo start
   ```

4. Leia o QR code com o Expo Go (Android) ou com a câmera (iPhone).

O celular precisa estar **na mesma rede Wi-Fi** do computador. O app chama a API no IP do computador, porta 3333 (veja `src/lib/config.ts`). Se a API não responder:

- Na primeira vez, o **Firewall do Windows** pode bloquear a porta 3333. Libere o Node.js para redes privadas.
- Se a rede isolar os aparelhos (Wi-Fi de faculdade, por exemplo), use `npx expo start --tunnel` e defina `EXPO_PUBLIC_API_URL` no `.env` com um endereço que o celular alcance (copie de `.env.example`).

Em desenvolvimento, a tela de login mostra as contas de teste (as mesmas do site). Elas não entram no app publicado.

## Login

O site guarda a sessão num cookie; o app usa **token**:

- `POST /api/auth/mobile/login` e `POST /api/auth/mobile/register` devolvem `{ token, expiresAt, user }`.
- O token fica no armazenamento seguro do aparelho (`expo-secure-store`: Keychain no iOS, Keystore no Android) e vai em todas as chamadas como `Authorization: Bearer <token>`.
- Sair = apagar o token. Se a API responder 401 (token expirado ou conta desativada), o app volta para o login.

## Estrutura

```
src/
├── app/                   rotas (Expo Router: cada arquivo é uma tela)
│   ├── _layout.tsx        AuthProvider + navegação
│   ├── index.tsx          manda para o login ou para a tela do perfil
│   ├── (auth)/            login e cadastro (só para quem não está logado)
│   └── (app)/             área logada
│       ├── aluno/         abas (Início, Questões, Ranking, Conta) + questão, tema, planos, anotações
│       ├── professor.tsx  (fase 5)
│       └── admin.tsx      (fase 6)
├── features/              uma pasta por assunto, como no site: api.ts + componentes
│   ├── auth/              login, AuthProvider, tela inicial provisória
│   ├── questions/         QuestionCard, lista, filtros, anotações, estado de prática
│   ├── dashboard/         API do dashboard e do ranking
│   └── plans/             API dos planos
├── components/            ui.tsx (Screen, Button, Card...) e feedback.tsx (barra de progresso, faixa do plano, recurso bloqueado)
├── lib/                   config (URL da API), http, token-storage, plan-access, format, useAsync
└── theme.ts               cores e raios iguais aos do site
```

As regras de plano (`lib/plan-access.ts`) são as mesmas do site e decidem o que aparecer; a API confere de novo em cada chamada.

Cada perfil só abre as próprias rotas; a API confere o perfil de novo em cada chamada.

## Comandos

| Comando | O que faz |
|---|---|
| `npx expo start` | Servidor de desenvolvimento (QR code para o Expo Go) |
| `npm run typecheck` | Checa os tipos |
| `npx expo-doctor` | Confere as versões das dependências com o SDK |
| `npx expo install <pacote>` | Instala um pacote na versão compatível com o SDK (use no lugar do `npm install <pacote>`) |

Esta pasta **não** é um workspace do monorepo: o Expo usa React 19 e o site usa React 18, e no mesmo workspace os pacotes entrariam em conflito. Por isso ela tem o próprio `package-lock.json` e o `npm install` é feito aqui dentro.

## Situação

- **Fase 2 (feita):** projeto, cliente da API, login, cadastro, sessão salva e navegação por perfil.
- **Fase 3 (feita):** aluno com abas Início (dashboard), Questões (busca e filtros por área e ano), Ranking (Geral e Simulados) e Conta; questão com resposta, gabarito da IA, comentário do professor, comunidade e anotações; Minhas anotações; troca de plano (simulada). Limite diário do plano Básico e recursos bloqueados seguem as regras do site.
- **Próximas fases:** aluno Premium (simulados e mentoria), professor e admin.

Diferença em relação ao site: na Comunidade o app só **mostra** os comentários. No site dá para escrever um, mas ele não é salvo na API (some ao recarregar), então o app não oferece isso.
