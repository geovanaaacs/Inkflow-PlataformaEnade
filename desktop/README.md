# Inkflow Admin — desktop

App de **administração** do Inkflow para Windows, em **C# com WPF (.NET 10)**. Ele usa a mesma API do site e do app (`backend/`), com login de administrador por token.

| Tela | O que faz |
|---|---|
| **Painel** | Usuários (total, ativos, novos em 30 dias), alunos ativos na semana, receita mensal recorrente, recebido em 30 dias, **alunos por plano** (gráfico), perfis, engajamento e respostas por dia (gráfico dos últimos 14 dias) |
| **Usuários** | Busca por nome/e-mail e filtro por perfil; muda o **perfil** (aluno, professor, administrador), o **plano** do aluno e desativa/reativa a conta, sempre com confirmação |
| **Questões** | Busca e filtro por área; **cadastra**, edita e remove questões (alternativas A–E, gabarito, tópico, explicação da IA) e **importa várias de uma vez** de um PDF de prova ou de uma planilha |
| **Pagamentos** | Total recebido, últimos 30 dias, ticket médio e receita por plano; lista dos pagamentos com aluno, plano, valor, forma (cartão com os 4 últimos dígitos, Pix ou registro anterior) e situação |

Só contas com perfil **administrador** entram; a API confere o perfil de novo em cada chamada.

## Como rodar

Pré-requisitos: **.NET 10 SDK** (ou o Visual Studio 2026 com a carga de trabalho ".NET desktop") e a API rodando.

1. Na raiz do projeto, suba a API (e o site): `npm run dev`.
2. Rode o app:

   ```powershell
   cd desktop
   dotnet run --project InkflowAdmin
   ```

   Ou abra `desktop/InkflowAdmin.slnx` no Visual Studio, defina **InkflowAdmin** como projeto de inicialização e aperte F5.

3. Entre com a conta admin (a do `ADMIN_EMAIL`/`ADMIN_PASSWORD` do `backend/.env`; em desenvolvimento, `admin@inkflow.com`).

O endereço da API fica em **Servidor**, na tela de login (padrão `http://localhost:3333/api`). `F5` ou **Atualizar** recarrega a tela aberta.

Para gerar o executável: `dotnet publish InkflowAdmin -c Release -r win-x64 --self-contained false` (fica em `InkflowAdmin/bin/Release/net10.0-windows/win-x64/publish/`).

## Importar várias questões (PDF ou planilha)

Em **Questões → Importar (PDF ou planilha)…**:

1. **Abrir PDF…** — o programa lê o texto da prova (também em duas colunas, como no ENADE) e separa cada questão: enunciado, alternativas A–E e, se houver, o gabarito. O **ano e a dificuldade padrão** valem para todas (o código vira `Q<ano>-<número da questão>`); **área e tópico são sugeridos** (veja abaixo).
   Ou **Abrir planilha…** — um `.xlsx` ou `.csv` no formato do **modelo** (botão "Baixar modelo"), uma questão por linha. Linhas sem tópico também recebem sugestão.
2. **Revisar** — à esquerda, a lista com a situação de cada questão (*Pronta* ou *Corrigir*, com o motivo); à direita, o editor completo da questão selecionada. Corrija o que for preciso e marque **Aprovar**. "Aplicar a todas" troca área, tópico, ano e dificuldade de todas de uma vez.
   Se preferir revisar no Excel: **Exportar para Excel/CSV**, corrija lá, marque `sim` na coluna `aprovar` e use **Abrir planilha** para trazer de volta.
3. **Importar N questões aprovadas** — só as aprovadas e sem problemas são gravadas, uma a uma; a coluna Situação mostra o resultado de cada uma (por exemplo, código já existente).

As regras conferidas antes de gravar são as mesmas da API: código no formato `Q2024-15` e ainda não usado, área existente, tópico, ano entre 2004 e o ano que vem, as cinco alternativas e a correta.

O que o leitor de PDF reconhece:

| No PDF | Exemplo |
|---|---|
| Início da questão | `QUESTÃO 12` ou, se não houver, `12.` / `12)` no começo da linha |
| Alternativas | `A)`, `(A)`, `A.`, `a)` ou a letra sozinha seguida do texto (formato do ENADE) |
| Gabarito | Seção `GABARITO` no fim (`1 - B   2 - D` …) ou uma linha `Gabarito: B` / `Resposta: B` dentro da questão |

### Sugestão de área e tópico

O PDF normalmente não diz o assunto de cada questão, então o programa **sugere** a área e o tópico (sem internet e sem IA paga), nesta ordem:

1. **Tópico escrito no PDF** — uma linha `Tópico:`, `Assunto:`, `Conteúdo:` ou `Tema:` dentro da questão é usada como está.
2. **Questão parecida no banco** — o texto é comparado com as questões já cadastradas (TF-IDF + similaridade de cosseno); com semelhança de 25% ou mais, usa a área e o tópico da mais parecida (ex.: "sugerido: parecido com Q2024-34 (45%)").
3. **Palavras-chave da área** — termos típicos de cada área (SQL, tabela, join → Banco de Dados; TCP, IP, roteador → Redes; processo, deadlock → Sistemas Operacionais…) indicam a área, e o tópico fica o mais parecido dela ou **"Geral"**.
4. Nada encontrado — usa a área e o tópico padrão.

Na lista, o tópico sugerido aparece como "(sugerido)" e o editor diz de onde veio; ao mudar área ou tópico na mão, a marca some. O campo de tópico do editor lista os tópicos já usados na área (ou aceita um novo). **"Sugerir tópicos"** refaz as sugestões; **"Aplicar a todas"** troca tudo pelos valores padrão. As sugestões melhoram conforme o banco cresce: num teste em que cada questão do banco é classificada usando só as outras, a área sugerida acertou 25 de 29.

Limites: PDFs escaneados (imagem) não têm texto para ler; imagens, gráficos e fórmulas da prova não são importados; um enunciado que comece com a letra de uma alternativa pode precisar de ajuste manual. Por isso nada é gravado sem a sua aprovação.

Para experimentar: [`exemplos/questoes-exemplo.pdf`](exemplos/questoes-exemplo.pdf) (prova fictícia em duas colunas, com 4 questões e gabarito) e [`exemplos/modelo-questoes.xlsx`](exemplos/modelo-questoes.xlsx).

## Estrutura

```
desktop/
├── InkflowAdmin.slnx            solução (Visual Studio 2026 / dotnet)
├── InkflowAdmin.Core/           biblioteca sem interface: cliente da API e modelos
│   ├── InkflowApi.cs            HttpClient + token Bearer, erros { message } → ApiException
│   ├── Models.cs                registros C# com o mesmo formato do JSON da API
│   └── Import/                  importação: PdfTextExtractor (PdfPig), QuestionTextParser,
│                                QuestionSheet (Excel/CSV, ClosedXML), QuestionDraftValidator,
│                                TopicSuggester (sugestão de área e tópico)
├── InkflowAdmin/                o app WPF
│   ├── App.xaml(.cs)            início: login → janela principal; cultura pt-BR (R$, datas)
│   ├── Themes/Theme.xaml        cores (as mesmas do site) e estilos
│   ├── LoginWindow.xaml         login de administrador
│   ├── MainWindow.xaml          barra lateral + página aberta
│   └── Views/                   Painel, Usuários, Questões (+ editor e importação), Pagamentos
├── InkflowAdmin.Smoke/          testes: Core contra a API real e a importação (offline)
└── exemplos/                    PDF de prova fictícia e modelo de planilha para testar a importação
```

Cada tela é um `UserControl` que implementa `IAdminPage` (título, subtítulo e `RefreshAsync`). Os gráficos são desenhados com o próprio WPF, sem pacotes de terceiros.

## Teste rápido do cliente da API

Com a API rodando:

```powershell
cd desktop
dotnet run --project InkflowAdmin.Smoke -- admin@inkflow.com <senha>
```

Faz login, lê métricas, pagamentos, usuários e questões, e confere as recusas da API (código de questão inválido, admin rebaixando a si mesmo, login de aluno, API fora do ar). Só lê: não grava nada no banco.

Teste da importação (não precisa da API): gera uma prova fictícia em PDF de duas colunas, lê de volta e confere enunciados, alternativas, gabarito e a ida e volta pela planilha:

```powershell
dotnet run --project InkflowAdmin.Smoke -- importacao
```

## Rotas da API usadas

`POST /auth/mobile/login`, `GET /admin/metrics`, `GET /admin/payments`, `GET|PATCH /admin/users`, `GET|POST|PUT|DELETE /admin/questions` e `GET /admin/questions/catalog`. Documentação completa em `/api/docs` (Swagger).

Os pagamentos vêm da tabela `dbo.Payments` (`database/10_pagamentos.sql`): o checkout do site e do app é simulado e envia só a forma de pagamento e os 4 últimos dígitos do cartão.
