namespace InkflowAdmin.Core;

/*
 * Shapes of the Inkflow API JSON (backend/src/docs/openapi.ts, also served at
 * /api/docs). Property names follow the API in camelCase through
 * JsonSerializerDefaults.Web, so the C# names are just PascalCase versions.
 */

public record AuthUser(string Id, string Name, string Email, string Role, string? Plan, string? Course);

public record TokenResponse(string Token, DateTimeOffset ExpiresAt, AuthUser User);

public record AdminUser(string Id, string Name, string Email, string Role, string? Plan, string? Course, bool Active)
{
    public string RoleLabel => Labels.Role(Role);
    public string PlanLabel => Plan is null ? "—" : Labels.Plan(Plan);
    public string StatusLabel => Active ? "Ativa" : "Desativada";
}

/// <summary>Changes sent to PATCH /admin/users/{id}; only the fields set here are sent.</summary>
public record AdminUserChanges(string? Role = null, string? Plan = null, bool? Active = null);

public record Area(string Slug, string Name, string ShortName);

public record QuestionOption(string Id, string Label);

public record TeacherComment(string Name, string Credentials, string Comment);

public record Question(
    string Id,
    string Code,
    Area Area,
    string Topic,
    int Year,
    string Type,
    string Difficulty,
    string Statement,
    List<QuestionOption> Options,
    string CorrectOptionId,
    string AiExplanation,
    TeacherComment Teacher)
{
    public string CorrectLetter => CorrectOptionId.ToUpperInvariant();
}

public record QuestionCatalog(List<Area> Areas, Dictionary<string, List<string>> TopicsByArea);

/// <summary>Body of POST/PUT /admin/questions: five option texts (a–e) and the correct letter.</summary>
public record QuestionInput(
    string Code,
    string AreaSlug,
    string Topic,
    int Year,
    string Difficulty,
    string Statement,
    List<string> Options,
    string CorrectOptionId,
    string AiExplanation);

public record UserCounts(int Total, int Active, int Inactive, RoleCounts ByRole, int NewLast30Days, int NewTeachersLast30Days);

/// <summary>Paid plans students signed up for in the last 30 days.</summary>
public record Adhesions(int Last30Days, List<PlanAdhesions> ByPlan);

public record PlanAdhesions(string Plan, string Name, int Count);

public record RoleCounts(int Aluno, int Professor, int Admin);

public record PlanStudents(string Plan, string Name, int Students, decimal Price);

public record ActivityCounts(
    int AnswersToday,
    int AnswersLast7Days,
    int ActiveStudentsLast7Days,
    int MockExamsFinishedLast30Days,
    int MentoringRequestsLast30Days);

public record DayAnswers(string Date, int Answers);

public record Revenue(decimal MonthlyRecurring, decimal Last30Days, int PaymentsLast30Days, decimal Total);

public record AdminMetrics(
    UserCounts Users,
    Adhesions Adhesions,
    List<PlanStudents> StudentsByPlan,
    ActivityCounts Activity,
    List<DayAnswers> AnswersByDay,
    Revenue Revenue);

public record AdminPayment(
    string Id,
    string UserId,
    string UserName,
    string UserEmail,
    string Plan,
    string PlanName,
    decimal Amount,
    string Method,
    string? CardLast4,
    string Status,
    DateTimeOffset PaidAt)
{
    public string MethodLabel => Method switch
    {
        "cartao" => CardLast4 is null ? "Cartão" : $"Cartão •••• {CardLast4}",
        "pix" => "Pix",
        _ => "Registro anterior",
    };

    public string StatusLabel => Status == "aprovado" ? "Aprovado" : "Estornado";
}

/// <summary>Portuguese labels for the API's codes.</summary>
public static class Labels
{
    public static readonly string[] Roles = ["aluno", "professor", "admin"];
    public static readonly string[] Plans = ["basico", "avancado", "premium"];
    public static readonly string[] Difficulties = ["fácil", "médio", "difícil"];

    public static string Role(string role) => role switch
    {
        "aluno" => "Aluno",
        "professor" => "Professor",
        "admin" => "Administrador",
        _ => role,
    };

    public static string Plan(string plan) => plan switch
    {
        "basico" => "Básico",
        "avancado" => "Avançado",
        "premium" => "Premium",
        _ => plan,
    };
}
