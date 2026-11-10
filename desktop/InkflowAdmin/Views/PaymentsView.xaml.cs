using System.Windows.Controls;
using InkflowAdmin.Core;

namespace InkflowAdmin.Views;

/// <summary>
/// Plan payments (GET /api/admin/payments). The checkout is simulated: only
/// the method and the last 4 card digits are recorded, never the card number.
/// </summary>
public partial class PaymentsView : UserControl, IAdminPage
{
    private const int Limit = 500;

    private readonly InkflowApi _api;
    private List<AdminPayment> _payments = new();

    public PaymentsView(InkflowApi api)
    {
        InitializeComponent();
        _api = api;
        MethodFilter.ItemsSource = new[]
        {
            new Option(null, "Todas as formas"),
            new Option("cartao", "Cartão"),
            new Option("pix", "Pix"),
            new Option("legado", "Registro anterior"),
        };
        MethodFilter.SelectedIndex = 0;
    }

    public string Title => "Pagamentos";
    public string Subtitle => "Assinaturas pagas, mais recentes primeiro. Checkout simulado: nenhum dado completo de cartão é guardado.";

    public async Task RefreshAsync()
    {
        Status.Text = "Carregando…";
        try
        {
            _payments = await _api.GetPaymentsAsync(Limit);
            ShowTotals();
            ApplyFilter();
        }
        catch (ApiException error)
        {
            Status.Text = error.Message;
        }
    }

    private void ShowTotals()
    {
        var approved = _payments.Where(p => p.Status == "aprovado").ToList();
        var since = DateTimeOffset.Now.AddDays(-30);
        var recent = approved.Where(p => p.PaidAt >= since).ToList();
        var byPlan = approved
            .GroupBy(p => p.PlanName)
            .OrderByDescending(g => g.Sum(p => p.Amount))
            .Select(g => $"{g.Key} {g.Sum(p => p.Amount):C}");
        Totals.ItemsSource = new[]
        {
            new Kpi("Total recebido", approved.Sum(p => p.Amount).ToString("C"), $"{approved.Count} pagamentos"),
            new Kpi("Últimos 30 dias", recent.Sum(p => p.Amount).ToString("C"), $"{recent.Count} pagamentos"),
            new Kpi("Ticket médio", approved.Count == 0 ? "—" : (approved.Sum(p => p.Amount) / approved.Count).ToString("C"), "por pagamento"),
            new Kpi("Por plano", approved.Count == 0 ? "—" : approved.GroupBy(p => p.PlanName).Count() + " planos", string.Join(" · ", byPlan)),
        };
    }

    private void OnFilterChanged(object sender, SelectionChangedEventArgs e) => ApplyFilter();

    private void ApplyFilter()
    {
        var method = (MethodFilter.SelectedItem as Option)?.Value;
        var visible = method is null ? _payments : _payments.Where(p => p.Method == method).ToList();
        PaymentsGrid.ItemsSource = visible;
        Status.Text = $"{visible.Count} {(visible.Count == 1 ? "pagamento" : "pagamentos")}" +
                      (_payments.Count == Limit ? $" (mostrando os {Limit} mais recentes)" : "");
    }
}
