using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InkflowAdmin.Core;

namespace InkflowAdmin.Views;

/// <summary>An option of a ComboBox: the API code plus its Portuguese label.</summary>
public record Option(string? Value, string Label)
{
    public override string ToString() => Label;
}

/// <summary>Search accounts and change profile, plan or access (GET/PATCH /api/admin/users).</summary>
public partial class UsersView : UserControl, IAdminPage
{
    private readonly InkflowApi _api;
    private AdminUser? _selected;

    public UsersView(InkflowApi api)
    {
        InitializeComponent();
        _api = api;
        RoleFilter.ItemsSource = new[] { new Option(null, "Todos os perfis") }
            .Concat(Labels.Roles.Select(r => new Option(r, Labels.Role(r))))
            .ToList();
        RoleFilter.SelectedIndex = 0;
        RoleBox.ItemsSource = Labels.Roles.Select(r => new Option(r, Labels.Role(r))).ToList();
        PlanBox.ItemsSource = Labels.Plans.Select(p => new Option(p, Labels.Plan(p))).ToList();
    }

    public string Title => "Usuários";
    public string Subtitle => "Perfis (aluno, professor, administrador), planos e acesso das contas.";

    public async Task RefreshAsync()
    {
        var keepId = _selected?.Id;
        Status.Text = "Carregando…";
        try
        {
            var role = (RoleFilter.SelectedItem as Option)?.Value;
            var users = await _api.GetUsersAsync(SearchBox.Text, role);
            UsersGrid.ItemsSource = users;
            Status.Text = $"{users.Count} {(users.Count == 1 ? "conta" : "contas")}";
            // Keep the same user selected after saving.
            UsersGrid.SelectedItem = users.FirstOrDefault(u => u.Id == keepId);
        }
        catch (ApiException error)
        {
            Status.Text = error.Message;
        }
    }

    private async void OnSearch(object sender, RoutedEventArgs e) => await RefreshAsync();

    private async void OnSearchKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter) await RefreshAsync();
    }

    private async void OnFilterChanged(object sender, SelectionChangedEventArgs e)
    {
        if (IsLoaded) await RefreshAsync();
    }

    private void OnSelect(object sender, SelectionChangedEventArgs e)
    {
        _selected = UsersGrid.SelectedItem as AdminUser;
        EditorMessage.Text = "";
        if (_selected is null)
        {
            Editor.Visibility = Visibility.Collapsed;
            EmptyHint.Visibility = Visibility.Visible;
            return;
        }

        var isMe = _selected.Id == _api.CurrentUser?.Id;
        Editor.Visibility = Visibility.Visible;
        EmptyHint.Visibility = Visibility.Collapsed;
        SelectedName.Text = _selected.Name + (isMe ? " (você)" : "");
        SelectedEmail.Text = _selected.Email;
        SelectedStatus.Text = _selected.Active ? "Conta ativa" : "Conta desativada";
        SelectedStatus.Foreground = (System.Windows.Media.Brush)FindResource(_selected.Active ? "Success" : "Danger");

        RoleBox.SelectedItem = ((IEnumerable<Option>)RoleBox.ItemsSource).First(o => o.Value == _selected.Role);
        RoleBox.IsEnabled = !isMe;
        RoleHint.Text = isMe ? "Você não pode mudar o seu próprio perfil." : "";
        ToggleButton.Visibility = isMe ? Visibility.Collapsed : Visibility.Visible;
        ToggleButton.Content = _selected.Active ? "Desativar conta" : "Reativar conta";
        UpdatePlanBox();
    }

    private void OnRoleChanged(object sender, SelectionChangedEventArgs e) => UpdatePlanBox();

    /// <summary>Only students have a plan; a new student starts on Básico.</summary>
    private void UpdatePlanBox()
    {
        if (_selected is null) return;
        var role = (RoleBox.SelectedItem as Option)?.Value;
        var staysStudent = role == "aluno" && _selected.Role == "aluno";
        PlanBox.IsEnabled = staysStudent;
        PlanBox.SelectedItem = ((IEnumerable<Option>)PlanBox.ItemsSource).FirstOrDefault(o => o.Value == (_selected.Plan ?? "basico"));
        PlanHint.Text = role != "aluno"
            ? "Professores e administradores não têm plano."
            : _selected.Role != "aluno" ? "Ao virar aluno, a conta começa no plano Básico." : "";
    }

    private async void OnSave(object sender, RoutedEventArgs e)
    {
        if (_selected is null) return;
        var role = (RoleBox.SelectedItem as Option)?.Value;
        var plan = (PlanBox.SelectedItem as Option)?.Value;

        var changes = new AdminUserChanges(
            Role: role != _selected.Role ? role : null,
            Plan: PlanBox.IsEnabled && plan != _selected.Plan ? plan : null);
        if (changes.Role is null && changes.Plan is null)
        {
            EditorMessage.Text = "Nada para alterar.";
            return;
        }

        var summary = string.Join("\n", new[]
        {
            changes.Role is null ? null : $"• Perfil: {Labels.Role(_selected.Role)} → {Labels.Role(changes.Role)}",
            changes.Plan is null ? null : $"• Plano: {_selected.PlanLabel} → {Labels.Plan(changes.Plan)}",
        }.Where(line => line is not null));
        var answer = MessageBox.Show($"Alterar a conta de {_selected.Name}?\n\n{summary}", "Confirmar alteração",
            MessageBoxButton.YesNo, MessageBoxImage.Question);
        if (answer == MessageBoxResult.Yes) await Apply(changes, "Alterações salvas.");
    }

    private async void OnToggleActive(object sender, RoutedEventArgs e)
    {
        if (_selected is null) return;
        var deactivate = _selected.Active;
        var question = deactivate
            ? $"Desativar a conta de {_selected.Name}?\n\nA pessoa não conseguirá mais entrar no Inkflow. O histórico é mantido e a conta pode ser reativada."
            : $"Reativar a conta de {_selected.Name}?";
        var answer = MessageBox.Show(question, deactivate ? "Desativar conta" : "Reativar conta",
            MessageBoxButton.YesNo, deactivate ? MessageBoxImage.Warning : MessageBoxImage.Question);
        if (answer == MessageBoxResult.Yes)
        {
            await Apply(new AdminUserChanges(Active: !deactivate), deactivate ? "Conta desativada." : "Conta reativada.");
        }
    }

    private async Task Apply(AdminUserChanges changes, string success)
    {
        SaveButton.IsEnabled = ToggleButton.IsEnabled = false;
        try
        {
            await _api.UpdateUserAsync(_selected!.Id, changes);
            await RefreshAsync();
            EditorMessage.Foreground = (System.Windows.Media.Brush)FindResource("Success");
            EditorMessage.Text = success;
        }
        catch (ApiException error)
        {
            // E.g. 409 "O Inkflow precisa de pelo menos um administrador ativo."
            EditorMessage.Foreground = (System.Windows.Media.Brush)FindResource("Danger");
            EditorMessage.Text = error.Message;
        }
        finally
        {
            SaveButton.IsEnabled = ToggleButton.IsEnabled = true;
        }
    }
}
