using System.Windows;
using InkflowAdmin.Core;

namespace InkflowAdmin;

public partial class LoginWindow : Window
{
    private bool _loggedIn;

    public LoginWindow()
    {
        InitializeComponent();
        ApiUrlBox.Text = InkflowApi.DefaultBaseUrl;
        Loaded += (_, _) => EmailBox.Focus();
    }

    private async void OnLogin(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(EmailBox.Text) || Password.Length == 0)
        {
            ShowError("Informe o e-mail e a senha.");
            return;
        }

        LoginButton.IsEnabled = false;
        LoginButton.Content = "Entrando…";
        ErrorText.Visibility = Visibility.Collapsed;

        var api = new InkflowApi(ApiUrlBox.Text.Trim());
        try
        {
            await api.LoginAsync(EmailBox.Text, Password);
            _loggedIn = true;
            App.ShowMain(api);
            Close();
        }
        catch (ApiException error)
        {
            api.Dispose();
            ShowError(error.Message);
            LoginButton.IsEnabled = true;
            LoginButton.Content = "Entrar";
        }
    }

    /// <summary>The password as typed, whichever box is showing it.</summary>
    private string Password => ShowPassword.IsChecked == true ? PasswordText.Text : PasswordBox.Password;

    private void OnShowPassword(object sender, RoutedEventArgs e)
    {
        PasswordText.Text = PasswordBox.Password;
        PasswordBox.Visibility = Visibility.Collapsed;
        PasswordText.Visibility = Visibility.Visible;
        EyeIcon.Text = ""; // "hide" eye
        ShowPassword.ToolTip = "Esconder senha";
        System.Windows.Automation.AutomationProperties.SetName(ShowPassword, "Esconder senha");
        PasswordText.Focus();
        PasswordText.CaretIndex = PasswordText.Text.Length;
    }

    private void OnHidePassword(object sender, RoutedEventArgs e)
    {
        PasswordBox.Password = PasswordText.Text;
        PasswordText.Text = "";
        PasswordText.Visibility = Visibility.Collapsed;
        PasswordBox.Visibility = Visibility.Visible;
        EyeIcon.Text = ""; // "show" eye
        ShowPassword.ToolTip = "Mostrar senha";
        System.Windows.Automation.AutomationProperties.SetName(ShowPassword, "Mostrar senha");
        PasswordBox.Focus();
    }

    private void ShowError(string message)
    {
        ErrorText.Text = message;
        ErrorText.Visibility = Visibility.Visible;
    }

    /// <summary>Closing the login without entering ends the app.</summary>
    private void OnClosed(object? sender, EventArgs e)
    {
        if (!_loggedIn) Application.Current.Shutdown();
    }
}
