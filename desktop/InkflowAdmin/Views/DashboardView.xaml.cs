using System.Globalization;
using System.Windows.Controls;
using InkflowAdmin.Core;

namespace InkflowAdmin.Views;

public record Kpi(string Title, string Value, string Detail);

public record Fact(string Title, string Value);

/// <summary>One bar of a chart: Size is already in pixels.</summary>
public record Bar(string Label, string Display, double Size, string Tooltip = "");

/// <summary>Numbers of the platform (GET /api/admin/metrics).</summary>
public partial class DashboardView : UserControl, IAdminPage
{
    private const double PlanBarMax = 260;
    private const double DayBarMax = 130;

    private readonly InkflowApi _api;

    public DashboardView(InkflowApi api)
    {
        InitializeComponent();
        _api = api;
    }

    public string Title => "Painel";
    public string Subtitle => "Usuários, adesões aos planos, alunos por plano e uso da plataforma.";

    public async Task RefreshAsync()
    {
        Status.Text = "Carregando…";
        try
        {
            Show(await _api.GetMetricsAsync());
            Status.Text = $"Atualizado às {DateTime.Now:HH:mm}.";
        }
        catch (ApiException error)
        {
            Status.Text = error.Message;
        }
    }

    private void Show(AdminMetrics m)
    {
        Kpis.ItemsSource = new[]
        {
            new Kpi("Usuários", m.Users.Total.ToString(), $"{m.Users.Active} ativos · {m.Users.NewLast30Days} novos em 30 dias"),
            new Kpi("Alunos ativos (7 dias)", m.Activity.ActiveStudentsLast7Days.ToString(), $"{m.Activity.AnswersLast7Days} respostas na semana"),
            // Money lives in the Pagamentos screen; here, how many students joined a paid plan.
            new Kpi("Adesões em 30 dias", m.Adhesions.Last30Days.ToString(),
                m.Adhesions.ByPlan.Count == 0 ? "planos pagos assinados" : string.Join(" · ", m.Adhesions.ByPlan.Select(p => $"{p.Count} {p.Name}"))),
            new Kpi("Professores novos (30 dias)", m.Users.NewTeachersLast30Days.ToString(),
                $"{m.Users.ByRole.Professor} {(m.Users.ByRole.Professor == 1 ? "professor" : "professores")} no total"),
        };

        var maxStudents = Math.Max(1, m.StudentsByPlan.Max(p => p.Students));
        PlanBars.ItemsSource = m.StudentsByPlan
            .Select(p => new Bar(p.Name, $"{p.Students} {(p.Students == 1 ? "aluno" : "alunos")}", PlanBarMax * p.Students / maxStudents))
            .ToList();
        var paying = m.StudentsByPlan.Where(p => p.Price > 0).Sum(p => p.Students);
        var students = m.StudentsByPlan.Sum(p => p.Students);
        PlanNote.Text = students == 0
            ? "Nenhum aluno ativo."
            : $"{paying} de {students} alunos em planos pagos ({100.0 * paying / students:0}%). Alunos sem assinatura contam como Básico.";

        Facts.ItemsSource = new[]
        {
            new Fact("Alunos", m.Users.ByRole.Aluno.ToString()),
            new Fact("Professores", m.Users.ByRole.Professor.ToString()),
            new Fact("Administradores", m.Users.ByRole.Admin.ToString()),
            new Fact("Contas desativadas", m.Users.Inactive.ToString()),
            new Fact("Respostas hoje", m.Activity.AnswersToday.ToString()),
            new Fact("Simulados finalizados (30 dias)", m.Activity.MockExamsFinishedLast30Days.ToString()),
            new Fact("Pedidos de mentoria (30 dias)", m.Activity.MentoringRequestsLast30Days.ToString()),
        };

        var maxAnswers = Math.Max(1, m.AnswersByDay.Max(d => d.Answers));
        DayBars.ItemsSource = m.AnswersByDay.Select(d =>
        {
            var date = DateTime.ParseExact(d.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            return new Bar(
                date.ToString("dd/MM"),
                d.Answers.ToString(),
                // A 2px stub keeps days without answers visible on the axis.
                Math.Max(2, DayBarMax * d.Answers / maxAnswers),
                $"{date:dddd, dd/MM}: {d.Answers} {(d.Answers == 1 ? "resposta" : "respostas")}");
        }).ToList();
    }
}
