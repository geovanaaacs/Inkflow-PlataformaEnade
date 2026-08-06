# Inkflow

Plataforma acadêmica para prática de questões do ENADE: banco de questões, correção por IA, comentários de professores e da comunidade, dashboard de desempenho e planos de assinatura.

Este repositório é a implementação em código do design feito no Figma. Todo o levantamento de arquitetura de design, tokens, variantes de componente e fluxos de navegação que embasou esta implementação está documentado em [`docs/analise-design-figma.md`](docs/analise-design-figma.md) — vale ler antes de mexer em UI.

> Projeto **frontend-only**: não há backend. Autenticação e dados (questões, dashboard, planos) são simulados em memória/`sessionStorage`, como uma "casca" pronta para ser conectada a uma API real. Veja [Dados mockados e backend](#dados-mockados-e-backend).

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
│   └── favicon.svg
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
          <Route path="/dashboard" element={<DashboardPage/>} />  →  /dashboard
          <Route path="/questoes"  element={<QuestionsPage/>} />  →  /questoes
          <Route path="/perfil"    element={<ProfilePage/>} />     →  /perfil
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

Pontos importantes:

- **`RequireAuth`** (`src/features/auth/RequireAuth.tsx`) é um "route guard": se não houver usuário autenticado, redireciona para `/entrar`. É o que protege `/dashboard`, `/questoes` e `/perfil`.
- **`/entrar`** aceita a query string `?modo=cadastro` para abrir direto na aba de cadastro (é assim que os botões "Comece grátis" da landing e dos planos funcionam).
- **`/questoes`** aceita `?revisar=<código>` (usado pelos links "Revisar" do Dashboard) para destacar visualmente a questão correspondente na lista.

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

### `layouts/`

Definem a "casca" visual de cada grupo de rotas (navbar + área de conteúdo via `<Outlet/>` do React Router):

- **`PublicLayout` + `PublicNavbar`** — usado por Landing e Planos. Navbar com logo + botões "Entrar"/"Comece grátis".
- **`AuthLayout`** — usado só por `/entrar`. Layout split-screen: painel institucional roxo à esquerda (escondido em telas pequenas), formulário à direita.
- **`AppLayout` + `AppNavbar`** — usado por Dashboard/Questões/Perfil. Navbar com abas de navegação (`NavTab` via `Button` com `active`) e botão de logout que abre o `LogoutModal`.

Todo layout inclui um **skip link** ("Pular para o conteúdo") como primeiro elemento focável — parte da estratégia de acessibilidade do projeto.

### `features/`

Uma pasta por tela/domínio de negócio. Cada uma é dona do seu estado, seus dados mock e seus subcomponentes. Não há acoplamento entre features — uma feature nunca importa componentes internos de outra (só primitivos de `design-system` e modais de `shared`).

### `shared/`

Código compartilhado **entre features**, mas que não é genérico o bastante para virar `design-system` (porque já conhece conceitos do produto). Hoje contém os três modais reaproveitados em mais de uma tela:

- `LogoutModal` — usado pelo `AppNavbar` (ícone de sair, visível em qualquer tela logada).
- `DeleteAccountModal` — usado pelo Perfil.
- `ChangePasswordModal` — usado tanto pelo "Esqueceu sua senha?" do login quanto pelo "Alterar senha" do Perfil.

## Telas, uma a uma

| Rota | Página | O que tem |
|---|---|---|
| `/` | `features/landing/LandingPage.tsx` | Hero com estatísticas, grid de 6 ferramentas, "como funciona" (3 passos), seletor de nível (fácil/médio/difícil), CTA final. |
| `/entrar` | `features/auth/AuthPage.tsx` | `SegmentedControl` Entrar/Cadastrar sincronizado com `?modo=`. Login (e-mail/senha + "esqueci a senha") e Cadastro (nome/e-mail/senha/perfil aluno-professor), ambos com validação e loading state. |
| `/planos` | `features/plans/PlansPage.tsx` | 3 `PlanCard` (Básico/Premium/Avançado), Premium destacado com badge "Mais popular". |
| `/dashboard` | `features/dashboard/DashboardPage.tsx` | Banner de plano gratuito, 3 `StatCard` (questões respondidas, taxa de acerto, streak), desempenho por área, últimos acertos/erros, grid de questões sugeridas, banners de upsell (Simulados/Ranking/Professores). |
| `/questoes` | `features/questions/QuestionsPage.tsx` | Filtros (palavra-chave, área, ano, tipo) + lista de `QuestionCard`. Cada questão: alternativas (radio), botão "Responder" (mostra feedback correto/errado), e botões que abrem painéis condicionais — **Gabarito IA**, **Comunidade**, **Professor** — mais um botão "Anotação" que abre um modal de nota. |
| `/perfil` | `features/profile/ProfilePage.tsx` | Resumo do usuário, formulário de informações pessoais, notificações (switches), segurança (alterar senha / apagar conta). |
| `*` | `features/misc/NotFoundPage.tsx` | 404 com link de volta para a home. |

## Autenticação (mock)

Não existe backend, então `src/features/auth/`:

- `auth-context.ts` — define o tipo `AuthUser`, o `AuthContext` e o hook `useAuth()`.
- `AuthProvider.tsx` — guarda o usuário logado em `sessionStorage` (sobrevive a um refresh da página, mas não a fechar a aba) e expõe `login(user)` / `logout()`.
- `RequireAuth.tsx` — guarda de rota: sem usuário autenticado, redireciona para `/entrar`.

Login e Cadastro (`LoginForm.tsx`/`SignupForm.tsx`) simulam uma chamada de rede com `setTimeout` e depois chamam `login(...)`, redirecionando para `/dashboard`.

**Para conectar a um backend real**, o ponto de troca é só esse: substituir o `setTimeout` + `login(...)` local por uma chamada real de API (ex.: `fetch`/React Query) dentro de `LoginForm`/`SignupForm`, e trocar o armazenamento do `AuthProvider` por token/cookie de sessão em vez de `sessionStorage`. Nada em `RequireAuth` ou nas telas protegidas precisa mudar.

## Dados mockados e backend

Cada feature com conteúdo dinâmico tem um `data.ts` com dados estáticos tipados:

- `features/dashboard/data.ts` — desempenho por área, últimos acertos/erros, tópicos sugeridos.
- `features/questions/data.ts` — banco de questões (enunciado, alternativas, gabarito, explicação de IA, comentário do professor, comentários da comunidade).
- `features/plans/data.ts` — os 3 planos e seus benefícios.

Esses arquivos existem para a UI ter conteúdo realista sem depender de uma API. Ao integrar com um backend, a troca é local: cada `*Page.tsx` passaria a buscar os dados (ex.: via `useEffect`/React Query) em vez de importar o array fixo de `data.ts`, mantendo os tipos (`Question`, `Plan`, `AreaPerformance` etc.) como o contrato entre UI e API.

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

Isso significa que qualquer classe Tailwind do tipo `bg-brand-600`, `text-ink-muted`, `rounded-card`, `shadow-input` etc. já usa o valor exato do design, em vez de hex/pixels soltos espalhados pelo código. O raciocínio completo por trás de cada token está em [`docs/analise-design-figma.md`](docs/analise-design-figma.md#2-design-tokens).

## Acessibilidade

- **Skip link** ("Pular para o conteúdo") em todo layout, antes de qualquer outro elemento focável.
- **Foco visível** consistente (`:focus-visible` com anel de destaque) em toda a aplicação — definido globalmente em `src/index.css`.
- **`Modal`** com focus trap (Tab/Shift+Tab não escapam do diálogo), fechamento por `Esc` e por clique fora, `role="dialog"` + `aria-modal` + `aria-labelledby`/`aria-describedby`, e devolução do foco ao elemento que abriu o modal quando ele fecha.
- **Formulários**: todo `<input>`/`<textarea>`/`<select>` tem `<label>` associado (via `Input`/`Select`), mensagens de erro em `role="alert"`, feedback assíncrono (ex.: "Alterações salvas") em regiões `aria-live="polite"`.
- **Padrões WAI-ARIA**: `SegmentedControl` usa `role="tablist"`/`role="tab"`/`aria-selected`; os botões de painel da questão (Gabarito IA/Comunidade/Professor) usam `aria-expanded`/`aria-controls` (padrão *disclosure*); barras de progresso usam `role="progressbar"` com `aria-valuenow/min/max`.
- **Lint dedicado**: `eslint-plugin-jsx-a11y` roda em todo `npm run lint`, pegando problemas comuns (alt text, roles inválidos, handlers em elementos não interativos etc.) antes mesmo de testar manualmente.

## Responsividade

O design original do Figma foi feito só para desktop (1440px, sem breakpoints mobile/tablet — detalhado em `docs/analise-design-figma.md`, seção 4). A implementação **adiciona** responsividade que não existia no arquivo de design, seguindo os breakpoints padrão do Tailwind (`sm`, `lg`):

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
