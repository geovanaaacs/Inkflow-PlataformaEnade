using System.Globalization;
using System.Windows;
using System.Windows.Markup;
using System.Windows.Threading;
using InkflowAdmin.Core;

namespace InkflowAdmin;

/// <summary>
/// Starts on the login window; after a successful admin login, opens the main
/// window. "Sair" in the main window goes back to the login.
/// </summary>
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Dates as 10/11/2026 and money as R$ 29,90, also inside XAML bindings.
        var culture = new CultureInfo("pt-BR");
        CultureInfo.DefaultThreadCurrentCulture = culture;
        CultureInfo.DefaultThreadCurrentUICulture = culture;
        FrameworkElement.LanguageProperty.OverrideMetadata(
            typeof(FrameworkElement),
            new FrameworkPropertyMetadata(XmlLanguage.GetLanguage(culture.IetfLanguageTag)));

        DispatcherUnhandledException += OnUnhandledException;
        ShowLogin();
    }

    public static void ShowLogin()
    {
        new LoginWindow().Show();
    }

    public static void ShowMain(InkflowApi api)
    {
        new MainWindow(api).Show();
    }

    /// <summary>Last resort: show the error instead of closing the app.</summary>
    private void OnUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        MessageBox.Show(e.Exception.Message, "Inkflow Admin — erro inesperado", MessageBoxButton.OK, MessageBoxImage.Error);
        e.Handled = true;
    }
}
