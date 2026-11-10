using InkflowAdmin.Core;

/*
 * Smoke test of InkflowAdmin.Core against a running API (npm run dev):
 *   dotnet run --project InkflowAdmin.Smoke -- <admin e-mail> <senha> [url da API]
 * Only reads and validation refusals — it never writes to the database.
 * Exit code 0 = every check passed.
 */

if (args.Length >= 1 && args[0] == "importacao")
{
    return ImportSelfTest.Run(args.Length > 1 ? args[1] : Path.Combine(Path.GetTempPath(), "inkflow-importacao"));
}

if (args.Length < 2)
{
    Console.WriteLine("Uso: dotnet run --project InkflowAdmin.Smoke -- <e-mail do admin> <senha> [url da API]");
    Console.WriteLine("     dotnet run --project InkflowAdmin.Smoke -- importacao [pasta de saída]");
    return 2;
}

var baseUrl = args.Length > 2 ? args[2] : InkflowApi.DefaultBaseUrl;
var failures = 0;

async Task Check(string name, Func<Task<string>> run)
{
    try
    {
        Console.WriteLine($"ok    {name}: {await run()}");
    }
    catch (Exception error)
    {
        failures++;
        Console.WriteLine($"FALHA {name}: {error.GetType().Name}: {error.Message}");
    }
}

async Task ExpectApiError(string name, int status, Func<Task> run)
{
    try
    {
        await run();
        failures++;
        Console.WriteLine($"FALHA {name}: esperava erro {status}, mas a chamada passou");
    }
    catch (ApiException error) when (error.Status == status)
    {
        Console.WriteLine($"ok    {name}: {status} \"{error.Message}\"");
    }
    catch (Exception error)
    {
        failures++;
        Console.WriteLine($"FALHA {name}: {error.GetType().Name}: {error.Message}");
    }
}

using var api = new InkflowApi(baseUrl);

await Check("login do admin", async () => (await api.LoginAsync(args[0], args[1])).Name);

await Check("métricas", async () =>
{
    var m = await api.GetMetricsAsync();
    var plans = string.Join(", ", m.StudentsByPlan.Select(p => $"{p.Name} {p.Students}"));
    return $"{m.Users.Total} usuários ({m.Users.ByRole.Aluno} alunos) · {plans} · {m.AnswersByDay.Count} dias · adesões em 30 dias {m.Adhesions.Last30Days} ({string.Join(", ", m.Adhesions.ByPlan.Select(p => $"{p.Name} {p.Count}"))}) · professores novos {m.Users.NewTeachersLast30Days}";
});

await Check("pagamentos", async () =>
{
    var payments = await api.GetPaymentsAsync(5);
    var first = payments.FirstOrDefault();
    return first is null ? "nenhum" : $"{payments.Count} · último: {first.UserName}, {first.PlanName}, {first.Amount:C}, {first.MethodLabel}, {first.PaidAt.LocalDateTime:g}";
});

await Check("usuários", async () =>
{
    var users = await api.GetUsersAsync();
    var teachers = await api.GetUsersAsync(role: "professor");
    var search = await api.GetUsersAsync(search: "nicole");
    return $"{users.Count} contas · {teachers.Count} professores · busca 'nicole' → {string.Join(", ", search.Select(u => $"{u.Name} ({u.PlanLabel})"))}";
});

await Check("catálogo de questões", async () =>
{
    var catalog = await api.GetQuestionCatalogAsync();
    return $"{catalog.Areas.Count} áreas · {catalog.TopicsByArea.Values.Sum(t => t.Count)} tópicos";
});

await Check("questões", async () =>
{
    var questions = await api.GetQuestionsAsync();
    var q = questions.First();
    return $"{questions.Count} questões · {q.Code} {q.Area.ShortName} › {q.Topic} · {q.Options.Count} alternativas, gabarito {q.CorrectLetter}";
});

await Check("sugestão de tópico (deixa uma de fora)", async () =>
{
    // Each question is classified with the other ones: how often does it get its own area / topic back?
    var bank = await api.GetQuestionsAsync();
    int area = 0, topic = 0, none = 0;
    foreach (var q in bank)
    {
        var suggestion = new InkflowAdmin.Core.Import.TopicSuggester(bank.Where(o => o.Id != q.Id))
            .Suggest(q.Statement, q.Options.Select(o => o.Label));
        if (suggestion is null) { none++; continue; }
        if (suggestion.AreaSlug == q.Area.Slug) area++;
        else if (Environment.GetEnvironmentVariable("INKFLOW_DEBUG") == "1")
            Console.WriteLine($"      {q.Code} ({q.Area.Slug} › {q.Topic}) → {suggestion.AreaSlug} › {suggestion.Topic} {suggestion.Score:P0} via {suggestion.BasedOn}");
        if (suggestion.AreaSlug == q.Area.Slug && suggestion.Topic == q.Topic) topic++;
    }
    // Informative (the bank is small: most topics have 1–2 questions, and this test removes one of them).
    var suggested = bank.Count - none;
    return $"{bank.Count} questões · {suggested} com sugestão: área certa {area}, tópico certo {topic} · {none} sem sugestão";
});

await Check("sugestão de tópico no PDF de exemplo", async () =>
{
    var pdf = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "exemplos", "questoes-exemplo.pdf");
    var drafts = InkflowAdmin.Core.Import.QuestionTextParser.Parse(
        InkflowAdmin.Core.Import.PdfTextExtractor.ReadLines(pdf), new("algoritmos", "", 2025, "médio"));
    var suggester = new InkflowAdmin.Core.Import.TopicSuggester(await api.GetQuestionsAsync());
    suggester.Apply(drafts, onlyMissingTopic: false);
    var q1 = drafts.Single(d => d.Code == "Q2025-1");
    var q2 = drafts.Single(d => d.Code == "Q2025-2");
    var q4 = drafts.Single(d => d.Code == "Q2025-4");
    // Q4 (Git) has no similar question in the bank: the keywords should still find the area.
    if (q1.Topic != "Normalização de Dados" || q2.Topic != "Protocolos HTTP" || q4.AreaSlug != "engenharia-de-software")
    {
        throw new Exception(string.Join(" | ", drafts.Select(d => $"{d.Code} → {d.AreaSlug} › {d.Topic}")));
    }
    return string.Join(" | ", drafts.Select(d => $"{d.Code} → {d.AreaSlug} › {(d.Topic.Length > 0 ? d.Topic : "(sem sugestão)")} [{d.TopicOrigin}]"));
});

await ExpectApiError("questão com código inválido", 400, () => api.CreateQuestionAsync(new QuestionInput(
    "X1", "banco-de-dados", "Teste", 2024, "médio", "Enunciado", ["a", "b", "c", "d", "e"], "a", "")));

await ExpectApiError("admin rebaixando a si mesmo", 409, () => api.UpdateUserAsync(api.CurrentUser!.Id, new AdminUserChanges(Role: "aluno")));

using (var student = new InkflowApi(baseUrl))
{
    await ExpectApiError("login de aluno é recusado", 403, () => student.LoginAsync("maria.clara@email.com", "aluno123"));
}

using (var offline = new InkflowApi("http://localhost:9/api"))
{
    await ExpectApiError("API fora do ar", 0, () => offline.LoginAsync("a@b.com", "x"));
}

Console.WriteLine(failures == 0 ? "\nTudo certo." : $"\n{failures} verificação(ões) falharam.");
return failures == 0 ? 0 : 1;
