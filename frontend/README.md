# Inkflow

Plataforma acadêmica para prática de questões do ENADE: banco de questões, correção por IA, comentários de professores e da comunidade, dashboard de desempenho e planos de assinatura.

Esta pasta (`frontend/`) é a implementação em código do design feito no Figma — veja o [README da raiz](../README.md) para o monorepo completo (frontend, backend e banco). Todo o levantamento de arquitetura de design, tokens, variantes de componente e fluxos de navegação que embasou esta implementação está documentado em [`docs/analise-design-figma.md`](../docs/analise-design-figma.md) — vale ler antes de mexer em UI.

> Projeto **frontend-only**: não há backend. Autenticação e dados (questões, dashboard, planos) são simulados por uma camada `api.ts` com mocks persistidos no `localStorage`, pronta para ser trocada por chamadas a uma API real. Veja [Dados mockados e backend](#dados-mockados-e-backend).

---

## Sumário

- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Execução](#execução)
- [Scripts disponíveis](#scripts-disponíveis)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como o app é montado (`App.tsx` e rotas)](#como-o-app-é-montado-apptsx-e-rotas)
- [Camadas da aplicação](#camadas-da-aplicação)
  - [`design-system/`](#design-system)
  - [`layouts/`](#layouts)
  - [`features/`](#features)
  - [`shared/`](#shared)
- [Telas, uma a uma](#telas-uma-a-uma)
- [Autenticação (mock)](#autenticação-mock)
- [Dados mockados e backend](#dados-mockados-e-backend)
- [Design tokens](#design-tokens)
- [Acessibilidade](#acessibilidade)
- [Responsividade](#responsividade)
- [Como estender o projeto](#como-estender-o-projeto)
- [Solução de problemas](#solução-de-problemas)

---

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Linguagem | TypeScript (modo `strict`) | ^5.5 |
| UI | React | ^18.3 |
| Build/dev server | Vite | ^5.4 |
| Estilização | Tailwind CSS | ^3.4 |
| Roteamento | React Router | ^6.26 |
| Ícones | lucide-react | ^0.441 |
| Lint | ESLint 9 (flat config) + `typescript-eslint` + `jsx-a11y` | — |

Não há dependências de UI de terceiros (nada de MUI/Chakra/Radix): todos os componentes visuais (`Button`, `Card`, `Modal`, `Select` etc.) foram construídos do zero em `src/design-system`, estilizados com Tailwind e os tokens extraídos do Figma.

## Pré-requisitos

- **Node.js 18.18+ ou 20+** (o projeto usa `"type": "module"` e Vite 5, que exigem Node moderno).
- **npm** (vem com o Node). Se preferir `pnpm`/`yarn`, funciona normalmente — só não há lockfile deles versionado.

Verifique sua versão:

```bash
node -v
npm -v
```

## Instalação

Clone o repositório (ou já estando na pasta do projeto) e instale as dependências:

```bash
npm install
```

Isso vai criar a pasta `node_modules/` com tudo que está listado em `package.json` (React, Vite, Tailwind, React Router, lucide-react e as ferramentas de dev — TypeScript, ESLint etc.).

## Execução

### Ambiente de desenvolvimento

```bash
npm run dev
```

Abre um servidor local (por padrão em `http://localhost:5173`) com hot-reload: qualquer alteração salva em `src/` atualiza a página automaticamente, sem perder o estado da tela na maioria dos casos.

### Build de produção

```bash
npm run build
```

Roda o typecheck completo (`tsc -b`) e depois gera os arquivos estáticos otimizados em `dist/` via Vite. **O build falha se houver qualquer erro de tipo** — é a mesma verificação usada como gate de qualidade durante todo o desenvolvimento deste projeto.

### Pré-visualizar o build de produção

```bash
npm run preview
```

Sobe um servidor estático local servindo o conteúdo de `dist/`, para conferir o resultado do `build` exatamente como ficaria em produção (sem hot-reload).

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento (Vite) com hot-reload. |
| `npm run build` | `tsc -b` (typecheck) + `vite build` (gera `dist/`). |
| `npm run typecheck` | Só o typecheck (`tsc -b --noEmit`), sem gerar build — útil para checar tipos rapidamente. |
| `npm run lint` | Roda o ESLint em todo o projeto (regras de React, hooks e `jsx-a11y` para acessibilidade). |
| `npm run preview` | Serve o conteúdo já buildado em `dist/` localmente. |

Fluxo recomendado antes de abrir um PR ou considerar uma tela "pronta": `npm run typecheck && npm run lint && npm run build`.

## Estrutura de pastas

```
Inkflow/
├── docs/
│   └── analise-design-figma.md   # análise do design (arquitetura, tokens, fluxos)
├── public/
│   └── logo.svg
│   └── homeImage.svg
├── src/
│   ├── main.tsx                  # entrypoint: monta <App /> no #root
│   ├── App.tsx                   # definição de TODAS as rotas da aplicação
│   ├── index.css                 # @tailwind base/components/utilities + estilos globais
│   ├── vite-env.d.ts
│   │
│   ├── design-system/            # primitivos de UI, agnósticos de domínio
│   │   ├── components/           # Button, Card, Input, Modal, Select, Switch, ...
│   │   └── utils/                # cn() (classnames), toneForPercent()
│   │
│   ├── layouts/                  # "casca" de cada grupo de rotas
│   │   ├── PublicLayout.tsx      # navbar pública + <Outlet/>       (landing, planos)
│   │   ├── PublicNavbar.tsx
│   │   ├── AuthLayout.tsx        # split-screen 50/50               (entrar/cadastrar)
│   │   ├── AppLayout.tsx         # navbar logada + <Outlet/>        (dashboard, questões, perfil)
│   │   └── AppNavbar.tsx
│   │
│   ├── features/                 # uma pasta por domínio/tela
│   │   ├── landing/
│   │   ├── auth/                 # AuthProvider, RequireAuth, formulários de login/cadastro
│   │   ├── dashboard/
│   │   ├── questions/            # QuestionCard com painéis condicionais (IA/Comunidade/Professor)
│   │   ├── profile/
│   │   ├── plans/
│   │   ├── mock-exams/           # simulados com timer (Premium)
│   │   ├── mentoring/            # mentoria coletiva e grupos de estudo (Premium)
│   │   ├── teacher/              # área do professor: dashboard e agenda
│   │   └── misc/                 # NotFoundPage (404)
│   │
│   └── shared/
│       └── modals/                # modais reaproveitados entre telas (Sair, Apagar conta, Alterar senha)
│
├── index.html
├── tailwind.config.ts             # design tokens (cores, radius, sombra, fontes)
├── postcss.config.js
├── vite.config.ts                 # alias "@" -> "src/"
├── tsconfig*.json
├── eslint.config.js
└── package.json
```

Dentro de cada `features/<tela>/`, o padrão é:

```
features/<tela>/
├── <Tela>Page.tsx        # componente de página, montado direto na rota
├── data.ts                # dados mock daquela tela (tipados)
├── api.ts                 # funções assíncronas que as telas chamam (hoje mock, amanhã HTTP)
└── components/             # subcomponentes específicos daquela tela
```

## Como o app é montado (`App.tsx` e rotas)

`src/App.tsx` é o único lugar onde as rotas são declaradas. Estrutura atual:

```
<AuthProvider>                          # contexto de autenticação mock (ver abaixo)
  <BrowserRouter>
    <Routes>
      <Route element={<PublicLayout/>}>          # navbar pública
        <Route index element={<LandingPage/>} />          →  /
        <Route path="/planos" element={<PlansPage/>} />   →  /planos
        <Route path="*" element={<NotFoundPage/>} />       →  qualquer rota não mapeada
      </Route>

      <Route path="/entrar" element={<AuthPage/>} />       →  /entrar (tela própria, sem PublicNavbar)

      <Route element={<RequireAuth/>}>            # bloqueia acesso sem login
        <Route element={<AppLayout/>}>            # navbar logada
          <Route element={<RequireAuth roles={["aluno", "professor"]}/>}>
            /questoes · /questoes/:code · /questoes/tema/:area
          </Route>
          <Route element={<RequireAuth roles={["aluno"]}/>}>
            /dashboard · /simulados · /simulados/:examId · /simulados/resultado/:attemptId · /mentoria
          </Route>
          <Route element={<RequireAuth roles={["professor"]}/>}>
            /professor · /professor/agenda
          </Route>
          <Route element={<RequireAuth roles={["admin"]}/>}>
            /admin/usuarios · /admin/questoes · /admin/simulados   (/admin → /admin/usuarios)
          </Route>
          /perfil                                  # todos os perfis
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

Pontos importantes:

- **`RequireAuth`** (`src/features/auth/RequireAuth.tsx`) é um "route guard": sem usuário autenticado, redireciona para `/entrar`; com `roles`, quem é do outro perfil volta para a própria área (`/dashboard` para aluno, `/professor` para professor).
- **`/entrar`** aceita a query string `?modo=cadastro` para abrir direto na aba de cadastro. Usuário já logado é redirecionado para a própria área.
- Links para `/planos`, `/questoes/:code` e outras telas "de ida e volta" passam `state={{ from }}` (`shared/navigation/return-to.ts`), e o `BackButton` usa isso para voltar à tela de origem.
- Recursos pagos **não são escondidos**: a rota abre, e a tela mostra o `LockedFeature`/`UpsellBar` com convite de upgrade.

## Camadas da aplicação

### `design-system/`

Componentes **sem nenhum conhecimento de domínio** (não sabem o que é "questão" ou "plano"). Reexportados todos em `design-system/components/index.ts`, então o import fica assim:

```ts
import { Button, Card, Modal } from "@/design-system/components";
```

| Componente | Para quê |
|---|---|
| `Button` | Botão/link/`<Link>` de rota — polimórfico via `to`/`href`. Variantes: `primary`, `outline`, `soft`, `ghost`, `danger`. |
| `Card` | Superfície elevada base (fundo branco, radius, sombra) usada por todo card do app. |
| `FeatureCard` | Ícone + título + descrição — usado na landing e em blocos de destaque. |
| `IconBadge` | Ícone dentro de um quadrado arredondado colorido. |
| `Badge` | Etiqueta pequena ("Pro", "Hoje", status). |
| `Input` / `Textarea` | Campo de formulário com label, ícone opcional, erro e hint. |
| `Select` | `<select>` nativo estilizado (acessibilidade de teclado/leitor de tela de graça). |
| `Switch` | Toggle on/off (usado em notificações do Perfil). |
| `SegmentedControl` | Alternância tipo "pill" com 2+ opções (Entrar/Cadastrar, Aluno/Professor). |
| `ProgressBar` | Barra de progresso/percentual, com tom semântico (`toneForPercent`). |
| `Modal` | Diálogo acessível: focus trap, fecha com `Esc`/clique no fundo, devolve foco ao elemento que abriu. Base de todos os popups do app. |
| `Container` | Centraliza o conteúdo na largura de leitura (1160px) com padding responsivo. |
| `Logo` | Marca "Inkflow" (ícone + wordmark). |
| `Calendar` | Calendário mensal em pt-BR com marcadores por dia e navegação por teclado (setas, Home/End). Usado na mentoria do aluno e na agenda do professor. |
| `Spinner` | Indicador de carregamento com texto para leitor de tela. |

### `layouts/`

Definem a "casca" visual de cada grupo de rotas (navbar + área de conteúdo via `<Outlet/>` do React Router):

- **`PublicLayout` + `PublicNavbar`** — usado por Landing e Planos. Navbar com logo + botões "Entrar"/"Comece grátis".
- **`AuthLayout`** — usado só por `/entrar`. Layout split-screen: painel institucional roxo à esquerda (escondido em telas pequenas), formulário à direita.
- **`AppLayout` + `AppNavbar`** — usado pelas telas logadas. O menu depende do perfil (aluno: Questões, Dashboard, Simulados, Mentoria; professor: Dashboard, Questões, Agenda; admin: Usuários, Questões, Simulados); itens de recursos que o plano não inclui aparecem com cadeado. Tem o botão de logout que abre o `LogoutModal`.

Todo layout inclui um **skip link** ("Pular para o conteúdo") como primeiro elemento focável — parte da estratégia de acessibilidade do projeto.

### `features/`

Uma pasta por tela/domínio de negócio. Cada uma é dona do seu estado, seus dados mock e seus subcomponentes. Uma feature nunca importa componentes internos de outra (só primitivos de `design-system` e o que está em `shared`); quando precisa de dados de outra feature, importa apenas o `api.ts`, os tipos e os formatadores (`format.ts`) dela.

Features atuais: `landing`, `auth`, `dashboard`, `questions`, `plans`, `profile`, `mock-exams` (simulados), `mentoring` (mentoria e grupos de estudo), `teacher` (área do professor), `admin` (gestão de usuários, questões e simulados) e `misc`.

### `shared/`

Código compartilhado **entre features**, mas que não é genérico o bastante para virar `design-system` (porque já conhece conceitos do produto):

- `api/` — `mock-store.ts` (persistência dos mocks no `localStorage`) e `api-error.ts` (`ApiError`, espelho de um erro HTTP).
- `components/` — `UpsellBar`, `LockedFeature`, `PlanBanner`, `BackButton`.
- `hooks/` — `useAsync` (carregamento/erro das chamadas de API) e `useCountdown` (timer dos simulados).
- `plans/plan-access.ts` — hierarquia dos planos e `hasFeature`.
- `navigation/return-to.ts` — estado "de onde vim" para os botões Voltar.
- `utils/dates.ts` — formatação de datas em pt-BR.
- `modals/` — `LogoutModal`, `DeleteAccountModal`, `ChangePasswordModal`.

## Telas, uma a uma

| Rota | Página | O que tem |
|---|---|---|
| `/` | `features/landing/LandingPage.tsx` | Hero com estatísticas, grid de 6 ferramentas, "como funciona" (3 passos), seletor de nível (fácil/médio/difícil), CTA final. |
| `/entrar` | `features/auth/AuthPage.tsx` | `SegmentedControl` Entrar/Cadastrar sincronizado com `?modo=`. Login (e-mail/senha + "esqueci a senha") e Cadastro (nome/e-mail/senha/perfil aluno-professor), ambos com validação e loading state. |
| `/planos` | `features/plans/PlansPage.tsx` | 3 `PlanCard` (Básico → Avançado → Premium) com preço; Premium destacado. Logado: "Voltar" para a tela de origem, "Seu plano atual" e troca de plano simulada. |
| `/dashboard` | `features/dashboard/DashboardPage.tsx` | Banner do plano (uso do dia no gratuito), 3 `StatCard`, desempenho por área, últimos acertos/erros ("Revisar" → `/questoes/:code`), "Minhas anotações" (Avançado+), **Ranking** com abas **Geral** (todos os planos; acerto = 10 pts, erro = 2 pts, 1ª tentativa da aba Questões) e **Simulados** (Premium; acertos da melhor tentativa de cada simulado), com "Como funciona" em tooltip, questões sugeridas ("Praticar agora" → `/questoes/tema/:area`) e upsells. |
| `/questoes` | `features/questions/QuestionsPage.tsx` | Filtros + lista de `QuestionCard`. "Responder" grava a tentativa (limite de 10 questões novas/dia no gratuito; refazer não conta). Painéis **Gabarito IA**, **Comunidade**, **Professor** e **Anotação** (várias anotações por questão, Avançado+). Professores também respondem (sem limite); as respostas deles são gravadas mas não entram no ranking. |
| `/questoes/:code` | `features/questions/QuestionDetailPage.tsx` | Uma questão específica (usada pelo "Revisar"). |
| `/questoes/tema/:area` | `features/questions/TopicQuestionsPage.tsx` | Só as questões de uma área ("Praticar agora"). |
| `/simulados` | `features/mock-exams/MockExamsPage.tsx` | Catálogo de simulados com última nota (Premium; bloqueado com upsell para os demais). |
| `/simulados/:examId` | `features/mock-exams/MockExamRunnerPage.tsx` | Instruções → simulado com timer regressivo, navegação entre questões e finalização automática ao zerar o tempo. |
| `/simulados/resultado/:attemptId` | `features/mock-exams/MockExamResultPage.tsx` | Acertos, aproveitamento, tempo e correção questão a questão. |
| `/mentoria` | `features/mentoring/MentoringPage.tsx` | Mentoria coletiva / grupo de estudo: calendário com os horários abertos pelos professores, solicitação de vaga e "Minhas solicitações" (Premium). |
| `/professor` | `features/teacher/TeacherDashboardPage.tsx` | Respostas dos alunos (filtros por área, aluno e resultado), estatísticas e questões com mais erros. |
| `/professor/agenda` | `features/teacher/TeacherAgendaPage.tsx` | Calendário com os horários do professor, cadastro/remoção de horários e solicitações dos alunos (aceitar/recusar). |
| `/admin/usuarios` | `features/admin/AdminUsersPage.tsx` | Busca de contas, troca de perfil (aluno/professor/admin) e de plano, desativar/reativar. |
| `/admin/questoes` | `features/admin/AdminQuestionsPage.tsx` | Banco de questões: listar, criar, editar e remover (alternativas, área/tópico, ano, dificuldade). |
| `/admin/simulados` | `features/admin/AdminMockExamsPage.tsx` | Simulados: listar, criar e editar (título, área, tempo e questões em ordem). |
| `/perfil` | `features/profile/ProfilePage.tsx` | Resumo do usuário, formulário de informações pessoais, notificações (switches), segurança (alterar senha / apagar conta). |
| `*` | `features/misc/NotFoundPage.tsx` | 404 com link de volta para a home. |

## Autenticação (mock)

Não existe backend, então `src/features/auth/`:

- `auth-context.ts` — define `AuthUser` (id, nome, e-mail, perfil `aluno`/`professor`, plano), o `AuthContext` e o hook `useAuth()`.
- `data.ts` — contas mock (aluna gratuita, Avançado e Premium, professora e admin) e a lista exibida no card "Contas de teste". Contas desativadas pelo admin não entram.
- `api.ts` — login, cadastro, logout e sessão. A sessão fica no `localStorage` (sobrevive a fechar o navegador).
- `AuthProvider.tsx` — restaura a sessão ao abrir o app e expõe `login`, `signup`, `logout` e `refreshUser`.
- `RequireAuth.tsx` — guarda de rota: sem login, redireciona para `/entrar`; com `roles`, manda quem é do outro perfil para a própria área (`/dashboard` ou `/professor`).

Em desenvolvimento (`npm run dev`), a tela de login mostra o card **Contas de teste**, com login em um clique e um botão para resetar os dados mock.

**Para conectar a um backend real**, só o `auth/api.ts` muda: `login`/`signup` passam a chamar a API, e a sessão vira um cookie httpOnly lido por `GET /api/me`.

## Dados mockados e backend

Cada feature com conteúdo dinâmico tem:

- `data.ts` — dados mock tipados (o "seed").
- `api.ts` — funções assíncronas que as telas chamam (`listPlans()`, `login()`…). Hoje leem o `data.ts` e o `shared/api/mock-store.ts`; com o backend, passam a fazer as requisições HTTP. **Componentes nunca importam `data.ts` direto.**

O `shared/api/mock-store.ts` guarda no `localStorage` o que é criado durante o uso (contas, plano assinado, etc.), para os dados sobreviverem ao recarregar a página. O `shared/hooks/useAsync.ts` controla carregamento e erro dessas chamadas.

Uma feature pode importar o `api.ts` e os tipos de outra (ex.: `plans/api.ts` usa `auth/api.ts`), nunca os componentes internos.

As regras de plano (Básico < Avançado < Premium) ficam em `shared/plans/plan-access.ts` (`hasFeature(plan, "notes")`).

## Design tokens

As cores, tipografia, espaçamento e radius extraídos do Figma foram levados para `tailwind.config.ts` (seção `theme.extend`), por exemplo:

```ts
colors: {
  brand: { 900: "#521594", 800: "#5808ad", 600: "#7631e2", ... },
  ink: { strong: "#2c2c2a", muted: "#888780" },
  success: { DEFAULT: "#1d9e75" },
  danger: { DEFAULT: "#d43336", ... },
  // ...
},
borderRadius: { button: "10px", input: "16px", card: "20px", ... },
boxShadow: { card: "...", input: "..." },
```

Isso significa que qualquer classe Tailwind do tipo `bg-brand-600`, `text-ink-muted`, `rounded-card`, `shadow-input` etc. já usa o valor exato do design, em vez de hex/pixels soltos espalhados pelo código. O raciocínio completo por trás de cada token está em [`docs/analise-design-figma.md`](../docs/analise-design-figma.md#2-design-tokens).

## Acessibilidade

- **Skip link** ("Pular para o conteúdo") em todo layout, antes de qualquer outro elemento focável.
- **Foco visível** consistente (`:focus-visible` com anel de destaque) em toda a aplicação — definido globalmente em `src/index.css`.
- **`Modal`** com focus trap (Tab/Shift+Tab não escapam do diálogo), fechamento por `Esc` e por clique fora, `role="dialog"` + `aria-modal` + `aria-labelledby`/`aria-describedby`, e devolução do foco ao elemento que abriu o modal quando ele fecha.
- **Formulários**: todo `<input>`/`<textarea>`/`<select>` tem `<label>` associado (via `Input`/`Select`), mensagens de erro em `role="alert"`, feedback assíncrono (ex.: "Alterações salvas") em regiões `aria-live="polite"`.
- **Padrões WAI-ARIA**: `SegmentedControl` usa `role="tablist"`/`role="tab"`/`aria-selected`; os botões de painel da questão (Gabarito IA/Comunidade/Professor) usam `aria-expanded`/`aria-controls` (padrão *disclosure*); barras de progresso usam `role="progressbar"` com `aria-valuenow/min/max`.
- **Lint dedicado**: `eslint-plugin-jsx-a11y` roda em todo `npm run lint`, pegando problemas comuns (alt text, roles inválidos, handlers em elementos não interativos etc.) antes mesmo de testar manualmente.

## Responsividade

O design original do Figma foi feito só para desktop (1440px, sem breakpoints mobile/tablet — detalhado em `../docs/analise-design-figma.md`, seção 4). A implementação **adiciona** responsividade que não existia no arquivo de design, seguindo os breakpoints padrão do Tailwind (`sm`, `lg`):

- Grids de card (landing, dashboard, planos) colapsam de 3 → 2 → 1 coluna.
- `AppNavbar` mostra as abas de navegação inline em telas largas e uma barra secundária com scroll horizontal em telas estreitas.
- `AuthLayout` esconde o painel institucional (roxo) abaixo do breakpoint `lg` e mostra só o formulário.
- `Container` aplica padding lateral responsivo (`px-4` → `sm:px-8` → `lg:px-10`) e trava a largura máxima em 1160px.

## Como estender o projeto

**Adicionar uma nova tela**

1. Criar `src/features/<nome>/<Nome>Page.tsx` (+ `data.ts`/`components/` se precisar).
2. Montar a UI reaproveitando `design-system/components` — só criar componente novo se o padrão visual realmente não existir ainda.
3. Registrar a rota em `src/App.tsx`, dentro do `<Route element={<PublicLayout/>}>` (pública) ou do bloco `<RequireAuth/><AppLayout/>` (autenticada).
4. Rodar `npm run typecheck && npm run lint && npm run build` antes de considerar pronto.

**Adicionar um componente novo ao design system**

1. Criar em `src/design-system/components/NomeDoComponente.tsx`.
2. Seguir o padrão dos demais: props tipadas, `cn()` para compor classes, tokens do `tailwind.config.ts` (nunca hex solto).
3. Reexportar em `src/design-system/components/index.ts`.

## Solução de problemas

- **`npm install` falha por causa de versão do Node** → confirme `node -v` ≥ 18.18 (o projeto foi desenvolvido/testado com Node 22).
- **Porta 5173 já em uso** → `npm run dev -- --port 5174` (ou finalize o processo que está usando a porta).
- **Erros de tipo após puxar mudanças novas** → rode `npm install` de novo (pode ter entrado dependência nova) e depois `npm run typecheck`.
- **Estilos do Tailwind não aparecem** → confirme que o arquivo novo está dentro de `src/` ou `index.html` (é o que `content` em `tailwind.config.ts` varre); classes montadas dinamicamente por concatenação de string não são detectadas pelo Tailwind — prefira o utilitário `cn()` com classes completas, como já é feito em todo o projeto.
