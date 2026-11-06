/* =============================================================================
   Inkflow — 09_mais_areas_e_questoes.sql
   Ajustes do teste de usabilidade (mais conteúdo):
     - 5 áreas de TI novas: Segurança da Informação, Desenvolvimento Web,
       Ciência de Dados, Arquitetura de Computadores e Computação em Nuvem
     - 20 questões novas (2 por área nova + 10 nas áreas que já existiam),
       com alternativas, explicação da IA e comentário de professor
     - simulados maiores: as questões novas entram nos simulados existentes
       (no fim, sem mudar a ordem das que já estavam) e há um simulado novo
       só com as áreas novas

   As questões foram escritas para o Inkflow no estilo do ENADE (não são
   cópias de provas).

   Pré-requisito: 01–08 (usa o professor Ricardo criado no 07).
   Idempotente: cada registro só é inserido se ainda não existir; os tempos e
   as descrições dos simulados são regravados a cada execução.
   ============================================================================= */

USE Inkflow;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRY
BEGIN TRANSACTION;

DECLARE @uMarcela UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000005';
DECLARE @uRicardo UNIQUEIDENTIFIER = 'A1000000-0000-0000-0000-000000000007';

/* -----------------------------------------------------------------------------
   1. Áreas e tópicos
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.Areas (Name, ShortName, Slug)
SELECT v.Name, v.ShortName, v.Slug
FROM (VALUES
    (N'Segurança da Informação',     N'Segurança',        N'seguranca'),
    (N'Desenvolvimento Web',         N'Dev. Web',         N'desenvolvimento-web'),
    (N'Ciência de Dados',            N'Ciência de Dados', N'ciencia-de-dados'),
    (N'Arquitetura de Computadores', N'Arquitetura',      N'arquitetura-de-computadores'),
    (N'Computação em Nuvem',         N'Nuvem',            N'computacao-em-nuvem')
) AS v (Name, ShortName, Slug)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Areas a WHERE a.Slug = v.Slug);

INSERT INTO dbo.Topics (AreaId, Name)
SELECT a.Id, v.TopicName
FROM (VALUES
    (N'seguranca', N'Criptografia'),
    (N'seguranca', N'Ataques e Vulnerabilidades'),
    (N'desenvolvimento-web', N'APIs REST'),
    (N'desenvolvimento-web', N'HTML e CSS'),
    (N'ciencia-de-dados', N'Estatística Descritiva'),
    (N'ciencia-de-dados', N'Visualização de Dados'),
    (N'arquitetura-de-computadores', N'Representação Numérica'),
    (N'arquitetura-de-computadores', N'Memória e Cache'),
    (N'computacao-em-nuvem', N'Modelos de Serviço'),
    (N'computacao-em-nuvem', N'Contêineres'),
    (N'engenharia-de-software', N'Engenharia de Requisitos'),
    (N'engenharia-de-software', N'Metodologias Ágeis'),
    (N'engenharia-de-software', N'Testes de Software'),
    (N'banco-de-dados', N'Transações'),
    (N'banco-de-dados', N'Linguagem SQL'),
    (N'redes', N'Endereçamento IP'),
    (N'redes', N'Camada de Aplicação'),
    (N'ia', N'Aprendizado de Máquina'),
    (N'algoritmos', N'Estruturas de Dados'),
    (N'sistemas-operacionais', N'Gerência de Memória')
) AS v (AreaSlug, TopicName)
JOIN dbo.Areas a ON a.Slug = v.AreaSlug
WHERE NOT EXISTS (SELECT 1 FROM dbo.Topics t WHERE t.AreaId = a.Id AND t.Name = v.TopicName);

/* -----------------------------------------------------------------------------
   2. Questões
   ----------------------------------------------------------------------------- */

INSERT INTO dbo.Questions (Code, TopicId, Year, Type, Difficulty, Statement, AiExplanation)
SELECT v.Code, t.Id, v.Year, N'Múltipla escolha', v.Difficulty, v.Statement, v.AiExplanation
FROM (VALUES
    (N'Q2024-301', N'seguranca', N'Criptografia', 2024, N'médio',
N'Uma empresa quer garantir que um contrato enviado por e-mail não foi alterado no caminho e que foi realmente assinado pela diretora. Qual mecanismo atende a esses dois requisitos?',
N'A assinatura digital cifra o resumo (hash) do documento com a chave privada de quem assina; qualquer pessoa confere com a chave pública. Se o documento mudar, o hash não confere (integridade), e só a dona da chave privada poderia ter assinado (autenticidade e não repúdio). AES garante sigilo, não autoria; Base64 é só uma codificação; um hash sem assinatura pode ser trocado junto com o arquivo; compactar com senha não prova quem enviou. Gabarito: B.'),

    (N'Q2023-302', N'seguranca', N'Ataques e Vulnerabilidades', 2023, N'fácil',
N'Em um formulário de login, o sistema monta a consulta concatenando o texto digitado:

SELECT * FROM Usuario WHERE login = ''<texto digitado>''

Um atacante digita  '' OR ''1''=''1  no campo de login e entra sem senha. Que ataque é esse e qual é a forma mais adequada de evitá-lo?',
N'O texto digitado fecha a aspa e acrescenta uma condição sempre verdadeira, alterando o comando SQL: é SQL Injection. A defesa padrão são consultas parametrizadas (prepared statements), em que o banco trata a entrada como dado e nunca como parte do comando. XSS injeta scripts na página; DoS, força bruta e phishing são outros tipos de ataque. Gabarito: B.'),

    (N'Q2024-303', N'desenvolvimento-web', N'APIs REST', 2024, N'médio',
N'Em uma API REST, qual combinação de método HTTP e rota segue as convenções para alterar apenas o e-mail do usuário de id 42?',
N'PATCH atualiza parte de um recurso, identificado pela URL (/usuarios/42), com os campos alterados no corpo. GET não deve alterar dados; rotas REST usam substantivos, e não verbos como /atualizarUsuario; DELETE remove; PUT substitui o recurso inteiro e o id deveria estar na URL. Gabarito: C.'),

    (N'Q2022-304', N'desenvolvimento-web', N'HTML e CSS', 2022, N'fácil',
N'Considere as regras CSS a seguir:

p { color: blue; }
.aviso { color: orange; }
#alerta { color: red; }

Qual será a cor do texto do elemento <p id="alerta" class="aviso">Atenção</p>?',
N'Quando várias regras se aplicam, vence a de maior especificidade: id (1,0,0) > classe (0,1,0) > elemento (0,0,1). O seletor #alerta é o mais específico, então o texto fica vermelho. A ordem das regras só desempata seletores de mesma especificidade. Gabarito: C.'),

    (N'Q2023-305', N'ciencia-de-dados', N'Estatística Descritiva', 2023, N'fácil',
N'Os salários (em mil reais) de cinco funcionários de uma startup são 3, 3, 4, 5 e 35. Qual medida de tendência central representa melhor o salário típico desse grupo, e qual é o seu valor?',
N'A média é 50 ÷ 5 = 10, puxada para cima pelo valor extremo 35, e não representa ninguém do grupo. A mediana (valor central dos dados ordenados) é 4 e não é afetada pelo valor extremo. A moda é 3. Com outliers, a mediana é a medida mais representativa. Gabarito: B.'),

    (N'Q2024-306', N'ciencia-de-dados', N'Visualização de Dados', 2024, N'fácil',
N'Uma analista precisa mostrar a evolução mês a mês do número de matrículas de um curso ao longo de três anos. Qual tipo de gráfico é o mais adequado?',
N'Séries temporais são mostradas com gráfico de linhas, que evidencia tendências e sazonalidade. Pizza mostra partes de um todo; histograma mostra a distribuição de uma variável; dispersão relaciona duas variáveis numéricas; mapa de calor geográfico mostra valores por região. Gabarito: B.'),

    (N'Q2022-307', N'arquitetura-de-computadores', N'Representação Numérica', 2022, N'médio',
N'Em complemento de dois com 8 bits, qual é a representação do número decimal −5?',
N'Escreve-se o positivo (5 = 00000101), invertem-se todos os bits (11111010, o complemento de um) e soma-se 1: 11111011. A opção 10000101 é a representação em sinal-magnitude. Gabarito: C.'),

    (N'Q2023-308', N'arquitetura-de-computadores', N'Memória e Cache', 2023, N'médio',
N'Um programa percorre uma matriz grande linha por linha, acessando posições consecutivas da memória. Esse padrão de acesso tende a ter alta taxa de acertos na cache principalmente por causa da:',
N'A cache traz blocos inteiros, com endereços vizinhos ao acessado. Ao percorrer posições consecutivas, os próximos acessos já estão no bloco carregado: é a localidade espacial. Localidade temporal é reacessar o mesmo endereço em pouco tempo. Gabarito: A.'),

    (N'Q2024-309', N'computacao-em-nuvem', N'Modelos de Serviço', 2024, N'fácil',
N'Uma equipe quer publicar sua aplicação web sem administrar servidores, sistema operacional ou ambiente de execução: ela só envia o código, e o provedor cuida do resto. Que modelo de serviço em nuvem atende a essa necessidade?',
N'No IaaS o provedor entrega infraestrutura (máquinas virtuais, rede) e o cliente cuida do sistema operacional para cima. No PaaS o provedor entrega a plataforma de execução e o cliente cuida só da aplicação e dos dados. No SaaS o cliente apenas usa um software pronto. Gabarito: B.'),

    (N'Q2023-310', N'computacao-em-nuvem', N'Contêineres', 2023, N'médio',
N'Sobre contêineres (como os do Docker) em comparação com máquinas virtuais, avalie as afirmativas:

I. Contêineres compartilham o núcleo (kernel) do sistema operacional hospedeiro.
II. Cada contêiner precisa de um sistema operacional convidado completo.
III. Contêineres costumam iniciar mais rápido e consumir menos recursos que máquinas virtuais.
IV. Uma imagem de contêiner empacota a aplicação e as suas dependências.

É correto o que se afirma em:',
N'I, III e IV são verdadeiras. II é falsa: um sistema operacional convidado completo por instância é característica das máquinas virtuais, que virtualizam o hardware. Contêineres isolam processos sobre o mesmo kernel, por isso são mais leves. Gabarito: C.'),

    (N'Q2024-311', N'engenharia-de-software', N'Engenharia de Requisitos', 2024, N'fácil',
N'No sistema de uma biblioteca universitária, qual dos itens abaixo é um requisito NÃO funcional?',
N'Requisitos funcionais descrevem o que o sistema faz (renovar empréstimo, emitir aviso, cadastrar livros, calcular multa). Requisitos não funcionais descrevem qualidades e restrições, como desempenho, segurança e disponibilidade: responder às buscas em até 2 segundos é um requisito de desempenho. Gabarito: C.'),

    (N'Q2023-312', N'engenharia-de-software', N'Metodologias Ágeis', 2023, N'fácil',
N'No Scrum, qual papel é responsável por ordenar o Product Backlog e maximizar o valor do produto?',
N'O Product Owner decide o que será feito e em que ordem, gerenciando o Product Backlog. Os Developers decidem como fazer; o Scrum Master cuida do processo e remove impedimentos. Gerente de projetos não é um papel do Scrum. Gabarito: B.'),

    (N'Q2022-313', N'engenharia-de-software', N'Testes de Software', 2022, N'médio',
N'Um desenvolvedor escreve um teste automatizado que verifica, isoladamente, se o método calcularDesconto() retorna o valor correto, substituindo o acesso ao banco de dados por um objeto simulado (mock). Esse é um exemplo de teste:',
N'Testar a menor parte do código de forma isolada, com as dependências simuladas, é teste de unidade. O teste de integração verifica partes reais funcionando juntas (por exemplo, com o banco de verdade); os de sistema e aceitação avaliam o sistema completo; o de carga mede o comportamento sob muitos acessos. Gabarito: A.'),

    (N'Q2024-314', N'banco-de-dados', N'Transações', 2024, N'médio',
N'Em uma transferência bancária, o débito em uma conta e o crédito na outra devem acontecer juntos: se o crédito falhar, o débito precisa ser desfeito. Qual propriedade ACID garante esse comportamento?',
N'Atomicidade: a transação é tudo ou nada; se uma operação falha, as anteriores são desfeitas (rollback). Consistência mantém as regras do banco; isolamento evita interferência entre transações simultâneas; durabilidade mantém o que foi confirmado. Disponibilidade não faz parte do ACID (aparece no teorema CAP). Gabarito: A.'),

    (N'Q2023-315', N'banco-de-dados', N'Linguagem SQL', 2023, N'médio',
N'Considere as tabelas Cliente(id, nome) e Pedido(id, cliente_id, valor). Qual consulta lista TODOS os clientes, inclusive os que nunca fizeram pedidos, com o total gasto por cada um?',
N'O LEFT JOIN a partir de Cliente mantém todos os clientes; quem não tem pedidos aparece com total NULL. O INNER JOIN descarta clientes sem pedidos; a opção C mantém os pedidos, e não os clientes; a D gera um produto cartesiano; a E filtra apenas quem tem pedido. Gabarito: B.'),

    (N'Q2022-316', N'redes', N'Endereçamento IP', 2022, N'médio',
N'Uma rede usa o endereço 192.168.10.0/26. Quantos endereços dessa sub-rede podem ser atribuídos a hosts?',
N'Com prefixo /26 sobram 32 − 26 = 6 bits para hosts: 2⁶ = 64 endereços. Descontam-se o endereço da rede e o de broadcast: 64 − 2 = 62 hosts. Gabarito: C.'),

    (N'Q2024-317', N'redes', N'Camada de Aplicação', 2024, N'fácil',
N'Ao digitar www.exemplo.com.br no navegador, qual serviço é responsável por traduzir esse nome no endereço IP do servidor?',
N'O DNS resolve nomes de domínio em endereços IP. O DHCP atribui endereços IP aos dispositivos; o SMTP envia e-mails; o FTP transfere arquivos; o ARP descobre o endereço MAC a partir do IP dentro da rede local. Gabarito: B.'),

    (N'Q2023-318', N'ia', N'Aprendizado de Máquina', 2023, N'difícil',
N'Um modelo de classificação atinge 99% de acurácia nos dados de treino, mas apenas 62% em dados novos. Qual é o diagnóstico mais provável e uma medida adequada?',
N'Desempenho muito alto no treino e baixo em dados novos indica overfitting: o modelo decorou o conjunto de treino em vez de generalizar. Validação cruzada, regularização, mais dados ou um modelo mais simples ajudam. Underfitting seria desempenho ruim também no treino. Gabarito: B.'),

    (N'Q2022-319', N'algoritmos', N'Estruturas de Dados', 2022, N'fácil',
N'Uma aplicação precisa desfazer as últimas ações do usuário na ordem inversa em que foram feitas: a última ação é a primeira a ser desfeita. Qual estrutura de dados é a mais adequada?',
N'A pilha segue a regra LIFO (último a entrar, primeiro a sair), exatamente o comportamento do "desfazer". A fila é FIFO; árvore, tabela hash e grafo não organizam os itens pela ordem de chegada. Gabarito: B.'),

    (N'Q2024-320', N'sistemas-operacionais', N'Gerência de Memória', 2024, N'médio',
N'Em um sistema com memória virtual paginada, o que acontece quando um processo acessa uma página que não está na memória principal?',
N'Ocorre uma falta de página (page fault): o sistema operacional interrompe o processo, traz a página do disco para um quadro livre (ou substitui outra página) e retoma a execução. Não é um erro fatal; é o funcionamento normal da memória virtual. Gabarito: B.')
) AS v (Code, AreaSlug, TopicName, Year, Difficulty, Statement, AiExplanation)
JOIN dbo.Areas a ON a.Slug = v.AreaSlug
JOIN dbo.Topics t ON t.AreaId = a.Id AND t.Name = v.TopicName
WHERE NOT EXISTS (SELECT 1 FROM dbo.Questions q WHERE q.Code = v.Code);

/* ---- Alternativas ---- */
INSERT INTO dbo.QuestionOptions (QuestionId, Letter, Text, IsCorrect)
SELECT q.Id, v.Letter, v.Text, v.IsCorrect
FROM (VALUES
    (N'Q2024-301', N'a', N'Criptografia simétrica do arquivo com AES.', CAST(0 AS BIT)),
    (N'Q2024-301', N'b', N'Assinatura digital feita com a chave privada da diretora.', CAST(1 AS BIT)),
    (N'Q2024-301', N'c', N'Codificação do arquivo em Base64.', CAST(0 AS BIT)),
    (N'Q2024-301', N'd', N'Envio do hash MD5 do arquivo no mesmo e-mail, sem assinatura.', CAST(0 AS BIT)),
    (N'Q2024-301', N'e', N'Compactação do arquivo com senha.', CAST(0 AS BIT)),

    (N'Q2023-302', N'a', N'Cross-site scripting (XSS); escapar o HTML exibido na página.', CAST(0 AS BIT)),
    (N'Q2023-302', N'b', N'SQL Injection; usar consultas parametrizadas (prepared statements).', CAST(1 AS BIT)),
    (N'Q2023-302', N'c', N'Negação de serviço (DoS); limitar o número de requisições.', CAST(0 AS BIT)),
    (N'Q2023-302', N'd', N'Força bruta; bloquear a conta após tentativas erradas.', CAST(0 AS BIT)),
    (N'Q2023-302', N'e', N'Phishing; treinar os usuários para reconhecer e-mails falsos.', CAST(0 AS BIT)),

    (N'Q2024-303', N'a', N'GET /usuarios/42?email=novo@exemplo.com', CAST(0 AS BIT)),
    (N'Q2024-303', N'b', N'POST /atualizarUsuario/42', CAST(0 AS BIT)),
    (N'Q2024-303', N'c', N'PATCH /usuarios/42, com o novo e-mail no corpo da requisição', CAST(1 AS BIT)),
    (N'Q2024-303', N'd', N'DELETE /usuarios/42/email', CAST(0 AS BIT)),
    (N'Q2024-303', N'e', N'PUT /usuarios, com o id e o e-mail no corpo da requisição', CAST(0 AS BIT)),

    (N'Q2022-304', N'a', N'Azul.', CAST(0 AS BIT)),
    (N'Q2022-304', N'b', N'Laranja.', CAST(0 AS BIT)),
    (N'Q2022-304', N'c', N'Vermelho.', CAST(1 AS BIT)),
    (N'Q2022-304', N'd', N'Preto, a cor padrão do navegador.', CAST(0 AS BIT)),
    (N'Q2022-304', N'e', N'Depende apenas da ordem em que as regras foram escritas.', CAST(0 AS BIT)),

    (N'Q2023-305', N'a', N'Média, igual a 10.', CAST(0 AS BIT)),
    (N'Q2023-305', N'b', N'Mediana, igual a 4.', CAST(1 AS BIT)),
    (N'Q2023-305', N'c', N'Moda, igual a 35.', CAST(0 AS BIT)),
    (N'Q2023-305', N'd', N'Média, igual a 4.', CAST(0 AS BIT)),
    (N'Q2023-305', N'e', N'Mediana, igual a 10.', CAST(0 AS BIT)),

    (N'Q2024-306', N'a', N'Gráfico de pizza.', CAST(0 AS BIT)),
    (N'Q2024-306', N'b', N'Gráfico de linhas.', CAST(1 AS BIT)),
    (N'Q2024-306', N'c', N'Histograma.', CAST(0 AS BIT)),
    (N'Q2024-306', N'd', N'Gráfico de dispersão sem ordem temporal.', CAST(0 AS BIT)),
    (N'Q2024-306', N'e', N'Mapa de calor geográfico.', CAST(0 AS BIT)),

    (N'Q2022-307', N'a', N'10000101', CAST(0 AS BIT)),
    (N'Q2022-307', N'b', N'11111010', CAST(0 AS BIT)),
    (N'Q2022-307', N'c', N'11111011', CAST(1 AS BIT)),
    (N'Q2022-307', N'd', N'00000101', CAST(0 AS BIT)),
    (N'Q2022-307', N'e', N'11111100', CAST(0 AS BIT)),

    (N'Q2023-308', N'a', N'localidade espacial.', CAST(1 AS BIT)),
    (N'Q2023-308', N'b', N'localidade temporal.', CAST(0 AS BIT)),
    (N'Q2023-308', N'c', N'memória virtual.', CAST(0 AS BIT)),
    (N'Q2023-308', N'd', N'política de substituição FIFO.', CAST(0 AS BIT)),
    (N'Q2023-308', N'e', N'interrupção de hardware.', CAST(0 AS BIT)),

    (N'Q2024-309', N'a', N'IaaS (Infraestrutura como Serviço).', CAST(0 AS BIT)),
    (N'Q2024-309', N'b', N'PaaS (Plataforma como Serviço).', CAST(1 AS BIT)),
    (N'Q2024-309', N'c', N'SaaS (Software como Serviço).', CAST(0 AS BIT)),
    (N'Q2024-309', N'd', N'Servidores próprios (on-premises).', CAST(0 AS BIT)),
    (N'Q2024-309', N'e', N'Colocation em data center.', CAST(0 AS BIT)),

    (N'Q2023-310', N'a', N'I e II, apenas.', CAST(0 AS BIT)),
    (N'Q2023-310', N'b', N'II e III, apenas.', CAST(0 AS BIT)),
    (N'Q2023-310', N'c', N'I, III e IV, apenas.', CAST(1 AS BIT)),
    (N'Q2023-310', N'd', N'II, III e IV, apenas.', CAST(0 AS BIT)),
    (N'Q2023-310', N'e', N'I, II, III e IV.', CAST(0 AS BIT)),

    (N'Q2024-311', N'a', N'O sistema deve permitir que o aluno renove um empréstimo.', CAST(0 AS BIT)),
    (N'Q2024-311', N'b', N'O sistema deve emitir um aviso de devolução atrasada.', CAST(0 AS BIT)),
    (N'Q2024-311', N'c', N'O sistema deve responder a qualquer busca no acervo em até 2 segundos.', CAST(1 AS BIT)),
    (N'Q2024-311', N'd', N'O bibliotecário deve poder cadastrar novos livros.', CAST(0 AS BIT)),
    (N'Q2024-311', N'e', N'O sistema deve calcular a multa por atraso.', CAST(0 AS BIT)),

    (N'Q2023-312', N'a', N'Scrum Master.', CAST(0 AS BIT)),
    (N'Q2023-312', N'b', N'Product Owner.', CAST(1 AS BIT)),
    (N'Q2023-312', N'c', N'Developers (time de desenvolvimento).', CAST(0 AS BIT)),
    (N'Q2023-312', N'd', N'Gerente de projetos.', CAST(0 AS BIT)),
    (N'Q2023-312', N'e', N'Cliente final.', CAST(0 AS BIT)),

    (N'Q2022-313', N'a', N'de unidade.', CAST(1 AS BIT)),
    (N'Q2022-313', N'b', N'de integração.', CAST(0 AS BIT)),
    (N'Q2022-313', N'c', N'de sistema.', CAST(0 AS BIT)),
    (N'Q2022-313', N'd', N'de aceitação.', CAST(0 AS BIT)),
    (N'Q2022-313', N'e', N'de carga.', CAST(0 AS BIT)),

    (N'Q2024-314', N'a', N'Atomicidade.', CAST(1 AS BIT)),
    (N'Q2024-314', N'b', N'Consistência.', CAST(0 AS BIT)),
    (N'Q2024-314', N'c', N'Isolamento.', CAST(0 AS BIT)),
    (N'Q2024-314', N'd', N'Durabilidade.', CAST(0 AS BIT)),
    (N'Q2024-314', N'e', N'Disponibilidade.', CAST(0 AS BIT)),

    (N'Q2023-315', N'a', N'SELECT c.nome, SUM(p.valor) FROM Cliente c INNER JOIN Pedido p ON p.cliente_id = c.id GROUP BY c.nome;', CAST(0 AS BIT)),
    (N'Q2023-315', N'b', N'SELECT c.nome, SUM(p.valor) FROM Cliente c LEFT JOIN Pedido p ON p.cliente_id = c.id GROUP BY c.id, c.nome;', CAST(1 AS BIT)),
    (N'Q2023-315', N'c', N'SELECT c.nome, SUM(p.valor) FROM Pedido p LEFT JOIN Cliente c ON p.cliente_id = c.id GROUP BY c.nome;', CAST(0 AS BIT)),
    (N'Q2023-315', N'd', N'SELECT c.nome, p.valor FROM Cliente c, Pedido p;', CAST(0 AS BIT)),
    (N'Q2023-315', N'e', N'SELECT nome, SUM(valor) FROM Cliente WHERE id IN (SELECT cliente_id FROM Pedido) GROUP BY nome;', CAST(0 AS BIT)),

    (N'Q2022-316', N'a', N'26', CAST(0 AS BIT)),
    (N'Q2022-316', N'b', N'30', CAST(0 AS BIT)),
    (N'Q2022-316', N'c', N'62', CAST(1 AS BIT)),
    (N'Q2022-316', N'd', N'64', CAST(0 AS BIT)),
    (N'Q2022-316', N'e', N'254', CAST(0 AS BIT)),

    (N'Q2024-317', N'a', N'DHCP', CAST(0 AS BIT)),
    (N'Q2024-317', N'b', N'DNS', CAST(1 AS BIT)),
    (N'Q2024-317', N'c', N'SMTP', CAST(0 AS BIT)),
    (N'Q2024-317', N'd', N'FTP', CAST(0 AS BIT)),
    (N'Q2024-317', N'e', N'ARP', CAST(0 AS BIT)),

    (N'Q2023-318', N'a', N'Underfitting; aumentar a regularização.', CAST(0 AS BIT)),
    (N'Q2023-318', N'b', N'Overfitting; usar validação cruzada, regularização ou mais dados de treino.', CAST(1 AS BIT)),
    (N'Q2023-318', N'c', N'Vazamento de dados; descartar o conjunto de teste.', CAST(0 AS BIT)),
    (N'Q2023-318', N'd', N'Underfitting; reduzir o número de exemplos de treino.', CAST(0 AS BIT)),
    (N'Q2023-318', N'e', N'Nenhum problema; essa diferença é esperada em qualquer modelo.', CAST(0 AS BIT)),

    (N'Q2022-319', N'a', N'Fila (FIFO).', CAST(0 AS BIT)),
    (N'Q2022-319', N'b', N'Pilha (LIFO).', CAST(1 AS BIT)),
    (N'Q2022-319', N'c', N'Árvore binária de busca.', CAST(0 AS BIT)),
    (N'Q2022-319', N'd', N'Tabela hash.', CAST(0 AS BIT)),
    (N'Q2022-319', N'e', N'Grafo.', CAST(0 AS BIT)),

    (N'Q2024-320', N'a', N'O processo é encerrado imediatamente com erro de segmentação.', CAST(0 AS BIT)),
    (N'Q2024-320', N'b', N'Ocorre uma falta de página (page fault) e o sistema operacional carrega a página do disco para a memória.', CAST(1 AS BIT)),
    (N'Q2024-320', N'c', N'A CPU ignora o acesso e continua a execução.', CAST(0 AS BIT)),
    (N'Q2024-320', N'd', N'O sistema entra em deadlock.', CAST(0 AS BIT)),
    (N'Q2024-320', N'e', N'A página é criada vazia na cache L1.', CAST(0 AS BIT))
) AS v (Code, Letter, Text, IsCorrect)
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.QuestionOptions o WHERE o.QuestionId = q.Id AND o.Letter = v.Letter);

/* ---- Comentários de professor (Marcela: software, dados e IA; Ricardo: infraestrutura) ---- */
INSERT INTO dbo.TeacherComments (QuestionId, TeacherUserId, Content)
SELECT q.Id, v.TeacherId, v.Content
FROM (VALUES
    (N'Q2024-301', @uRicardo, N'Sigilo: cifre com a chave pública de quem vai receber. Autoria e integridade: assine com a sua chave privada. O ENADE adora inverter essas duas direções.'),
    (N'Q2023-302', @uRicardo, N'Nunca concatene o que o usuário digitou dentro de um comando SQL. Com parâmetros, o banco trata a entrada como dado, e não como código.'),
    (N'Q2024-303', @uMarcela, N'A URL diz QUAL recurso (substantivo); o método diz O QUE fazer: GET lê, POST cria, PUT substitui, PATCH altera parte e DELETE remove.'),
    (N'Q2022-304', @uMarcela, N'Pense na especificidade como um placar id–classe–elemento. Quem tem mais pontos na casa mais à esquerda vence, não importa a ordem das regras.'),
    (N'Q2023-305', @uMarcela, N'Apareceu um valor muito fora da curva? Prefira a mediana. A média é sensível a outliers; a mediana não.'),
    (N'Q2024-306', @uMarcela, N'Comece perguntando o que o gráfico precisa responder: evolução no tempo → linhas; composição → pizza ou barras empilhadas; distribuição → histograma; relação entre duas variáveis → dispersão.'),
    (N'Q2022-307', @uRicardo, N'Receita do complemento de dois: escreva o número positivo, inverta todos os bits e some 1.'),
    (N'Q2023-308', @uRicardo, N'Espacial = vizinhos no endereço; temporal = o mesmo endereço de novo em pouco tempo. Percorrer um vetor em ordem é o exemplo clássico de localidade espacial.'),
    (N'Q2024-309', @uRicardo, N'Pense em quem gerencia o quê: no IaaS você cuida do sistema operacional para cima; no PaaS, só da aplicação; no SaaS, você só usa.'),
    (N'Q2023-310', @uRicardo, N'Máquina virtual virtualiza o hardware (cada uma com o seu sistema operacional); contêiner isola processos sobre o mesmo kernel. Daí a leveza dos contêineres.'),
    (N'Q2024-311', @uMarcela, N'Se descreve algo que o usuário faz no sistema, é funcional. Se descreve como o sistema deve se comportar (rapidez, segurança, disponibilidade), é não funcional.'),
    (N'Q2023-312', @uMarcela, N'Product Owner decide o quê e em que ordem; Developers decidem como; Scrum Master cuida do processo e remove impedimentos.'),
    (N'Q2022-313', @uMarcela, N'Isolou a menor parte e simulou as dependências? É teste de unidade. Testou as partes conversando de verdade? Integração.'),
    (N'Q2024-314', @uMarcela, N'Tudo ou nada = Atomicidade. É a propriedade que mais aparece em questões de transferência entre contas.'),
    (N'Q2023-315', @uMarcela, N'A tabela que precisa aparecer inteira fica à esquerda do LEFT JOIN. Os clientes sem pedidos vêm com total NULL — dá para trocar por 0 com COALESCE.'),
    (N'Q2022-316', @uRicardo, N'Hosts = 2^(32 − prefixo) − 2. Os dois descontados são o endereço da rede e o de broadcast.'),
    (N'Q2024-317', @uRicardo, N'DNS é a agenda telefônica da internet: nome → IP. Não confunda com ARP, que faz IP → MAC dentro da rede local.'),
    (N'Q2023-318', @uMarcela, N'Ótimo no treino e ruim em dados novos = decorou em vez de aprender (overfitting). Underfitting é ruim nos dois.'),
    (N'Q2022-319', @uMarcela, N'Desfazer, o botão voltar do navegador e a pilha de chamadas de funções usam pilha: o último que entra é o primeiro que sai.'),
    (N'Q2024-320', @uRicardo, N'Page fault não é erro: é o funcionamento normal da memória virtual. Faltas demais em sequência, porém, levam ao thrashing.')
) AS v (Code, TeacherId, Content)
JOIN dbo.Questions q ON q.Code = v.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.TeacherComments tc WHERE tc.QuestionId = q.Id AND tc.TeacherUserId = v.TeacherId);

/* -----------------------------------------------------------------------------
   3. Simulados maiores
   ----------------------------------------------------------------------------- */

/* ---- Simulado novo só com as áreas novas ---- */
INSERT INTO dbo.MockExams (Title, Description, AreaId, Difficulty, TimeLimitMinutes)
SELECT N'Segurança, Web, Dados e Nuvem',
       N'As áreas de TI mais recentes do banco: criptografia, ataques, APIs, CSS, estatística, arquitetura e nuvem.',
       NULL, N'médio', 25
WHERE NOT EXISTS (SELECT 1 FROM dbo.MockExams m WHERE m.Title = N'Segurança, Web, Dados e Nuvem');

/* ---- Questões novas nos simulados: entram no fim, sem mexer na ordem das que já estavam ---- */
INSERT INTO dbo.MockExamQuestions (MockExamId, QuestionId, DisplayOrder)
SELECT m.Id, q.Id, ISNULL(last.MaxOrder, 0) + ROW_NUMBER() OVER (PARTITION BY m.Id ORDER BY v.Seq)
FROM (VALUES
    (N'Programação e Engenharia de Software', N'Q2024-311', 1),
    (N'Programação e Engenharia de Software', N'Q2023-312', 2),
    (N'Programação e Engenharia de Software', N'Q2022-313', 3),
    (N'Programação e Engenharia de Software', N'Q2022-319', 4),
    (N'Programação e Engenharia de Software', N'Q2024-303', 5),

    (N'Infraestrutura, Redes e Dados', N'Q2024-314', 1),
    (N'Infraestrutura, Redes e Dados', N'Q2023-315', 2),
    (N'Infraestrutura, Redes e Dados', N'Q2022-316', 3),
    (N'Infraestrutura, Redes e Dados', N'Q2024-317', 4),
    (N'Infraestrutura, Redes e Dados', N'Q2024-320', 5),
    (N'Infraestrutura, Redes e Dados', N'Q2023-308', 6),

    (N'Simulado Geral ENADE', N'Q2024-301', 1),
    (N'Simulado Geral ENADE', N'Q2022-304', 2),
    (N'Simulado Geral ENADE', N'Q2023-305', 3),
    (N'Simulado Geral ENADE', N'Q2022-307', 4),
    (N'Simulado Geral ENADE', N'Q2024-309', 5),
    (N'Simulado Geral ENADE', N'Q2024-311', 6),
    (N'Simulado Geral ENADE', N'Q2024-314', 7),
    (N'Simulado Geral ENADE', N'Q2022-316', 8),
    (N'Simulado Geral ENADE', N'Q2023-318', 9),
    (N'Simulado Geral ENADE', N'Q2024-320', 10),

    (N'Simulado relâmpago', N'Q2024-317', 1),
    (N'Simulado relâmpago', N'Q2022-319', 2),

    (N'Simulado ENADE — Programação em C#', N'Q2021-15', 1),
    (N'Simulado ENADE — Programação em C#', N'Q2022-313', 2),
    (N'Simulado ENADE — Programação em C#', N'Q2022-319', 3),
    (N'Simulado ENADE — Programação em C#', N'Q2021-78', 4),

    (N'Segurança, Web, Dados e Nuvem', N'Q2024-301', 1),
    (N'Segurança, Web, Dados e Nuvem', N'Q2023-302', 2),
    (N'Segurança, Web, Dados e Nuvem', N'Q2024-303', 3),
    (N'Segurança, Web, Dados e Nuvem', N'Q2022-304', 4),
    (N'Segurança, Web, Dados e Nuvem', N'Q2023-305', 5),
    (N'Segurança, Web, Dados e Nuvem', N'Q2024-306', 6),
    (N'Segurança, Web, Dados e Nuvem', N'Q2022-307', 7),
    (N'Segurança, Web, Dados e Nuvem', N'Q2023-308', 8),
    (N'Segurança, Web, Dados e Nuvem', N'Q2024-309', 9),
    (N'Segurança, Web, Dados e Nuvem', N'Q2023-310', 10)
) AS v (Title, Code, Seq)
JOIN dbo.MockExams m ON m.Title = v.Title
JOIN dbo.Questions q ON q.Code = v.Code
OUTER APPLY (SELECT MAX(mq.DisplayOrder) AS MaxOrder FROM dbo.MockExamQuestions mq WHERE mq.MockExamId = m.Id) AS last
WHERE NOT EXISTS (SELECT 1 FROM dbo.MockExamQuestions mq WHERE mq.MockExamId = m.Id AND mq.QuestionId = q.Id);

/* ---- Tempo proporcional ao novo tamanho ---- */
UPDATE m
SET TimeLimitMinutes = v.Minutes,
    Description = COALESCE(v.Description, m.Description),
    UpdatedAt = SYSUTCDATETIME()
FROM dbo.MockExams m
JOIN (VALUES
    (N'Programação e Engenharia de Software', 30, CAST(NULL AS NVARCHAR(1000))),
    (N'Infraestrutura, Redes e Dados', 35, CAST(NULL AS NVARCHAR(1000))),
    (N'Simulado Geral ENADE', 60, CAST(NULL AS NVARCHAR(1000))),
    (N'Simulado ENADE — Programação em C#', 30, CAST(NULL AS NVARCHAR(1000))),
    (N'Simulado relâmpago', 3, N'Cinco questões em apenas 3 minutos. Ótimo para aquecer — e para ver a finalização automática quando o tempo acaba.')
) AS v (Title, Minutes, Description) ON v.Title = m.Title;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

/* Conferência */
SELECT 'Areas' AS Tabela, COUNT(*) AS Total FROM dbo.Areas
UNION ALL SELECT 'Questions (ativas)', COUNT(*) FROM dbo.Questions WHERE IsActive = 1
UNION ALL SELECT 'QuestionOptions', COUNT(*) FROM dbo.QuestionOptions
UNION ALL SELECT 'TeacherComments', COUNT(*) FROM dbo.TeacherComments
UNION ALL SELECT 'MockExams', COUNT(*) FROM dbo.MockExams;

SELECT m.Title, COUNT(mq.QuestionId) AS Questoes, m.TimeLimitMinutes AS Minutos
FROM dbo.MockExams m
LEFT JOIN dbo.MockExamQuestions mq ON mq.MockExamId = m.Id
GROUP BY m.Title, m.TimeLimitMinutes
ORDER BY m.Title;
GO
