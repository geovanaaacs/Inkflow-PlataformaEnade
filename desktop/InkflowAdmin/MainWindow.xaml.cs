using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InkflowAdmin.Core;
using InkflowAdmin.Views;

namespace InkflowAdmin;

/// <summary>A page of the main window: loads its data from the API.</summary>
public interface IAdminPage
{
    string Title { get; }
    string Subtitle { get; }
    Task RefreshAsync();
}

/// <summary>Sidebar navigation + the selected page. Pages are created once and kept.</summary>
public partial class MainWindow : Window
{
    private readonly InkflowApi _api;
    private readonly Dictionary<string, IAdminPage> _pages = new();
    private bool _loggingOut;

    public MainWindow(InkflowApi api)
    {
        InitializeComponent();
        _api = api;
        UserName.Text = api.CurrentUser?.Name;
        UserEmail.Text = api.CurrentUser?.Email;
        ApiUrl.Text = api.BaseUrl;
        InputBindings.Add(new KeyBinding(new RelayCommand(() => OnRefresh(this, new RoutedEventArgs())), Key.F5, ModifierKeys.None));
        Loaded += (_, _) => NavDashboard.IsChecked = true;
    }

    private async void OnNavigate(object sender, RoutedEventArgs e)
    {
        var key = (string)((RadioButton)sender).Tag;
        var isNew = !_pages.TryGetValue(key, out var page);
        if (isNew)
        {
            page = key switch
            {
                "usuarios" => new UsersView(_api),
                "questoes" => new QuestionsView(_api),
                "pagamentos" => new PaymentsView(_api),
                _ => new DashboardView(_api),
            };
            _pages[key] = page;
        }
        Page.Content = page;
        PageTitle.Text = page!.Title;
        PageSubtitle.Text = page.Subtitle;
        // Each visit shows fresh numbers.
        await page.RefreshAsync();
    }

    private async void OnRefresh(object sender, RoutedEventArgs e)
    {
        if (Page.Content is IAdminPage page) await page.RefreshAsync();
    }

    private void OnLogout(object sender, RoutedEventArgs e)
    {
        _loggingOut = true;
        _api.Logout();
        _api.Dispose();
        App.ShowLogin();
        Close();
    }

    private void OnClosed(object? sender, EventArgs e)
    {
        if (!_loggingOut) Application.Current.Shutdown();
    }
}

/// <summary>Minimal ICommand for key bindings.</summary>
public sealed class RelayCommand(Action run) : ICommand
{
    public event EventHandler? CanExecuteChanged { add { } remove { } }
    public bool CanExecute(object? parameter) => true;
    public void Execute(object? parameter) => run();
}
