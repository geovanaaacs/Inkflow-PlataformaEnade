using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Win32;

namespace InkflowAdmin;

public enum AppTheme
{
    Light,
    Dark,
}

/// <summary>
/// Light/dark theme of the app. Colors live in Themes/Colors.Light.xaml and
/// Colors.Dark.xaml (same keys) and are always used via DynamicResource, so
/// swapping the dictionary recolors the open windows at once. The choice is
/// saved per Windows user; until then the app follows the Windows app theme.
/// </summary>
public static class ThemeManager
{
    private static readonly string SettingsFile = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "InkflowAdmin", "tema.txt");

    public static AppTheme Current { get; private set; } = AppTheme.Light;

    public static event Action? Changed;

    /// <summary>Applies the saved (or the Windows) theme and darkens the title bar of every window that opens.</summary>
    public static void Initialize()
    {
        EventManager.RegisterClassHandler(typeof(Window), FrameworkElement.LoadedEvent,
            new RoutedEventHandler((sender, _) => ApplyTitleBar((Window)sender)));
        Apply(ReadSaved() ?? WindowsTheme());
    }

    public static void Toggle()
    {
        var next = Current == AppTheme.Dark ? AppTheme.Light : AppTheme.Dark;
        Apply(next);
        Save(next);
    }

    private static void Apply(AppTheme theme)
    {
        Current = theme;
        var dictionaries = Application.Current.Resources.MergedDictionaries;
        var colors = new ResourceDictionary
        {
            Source = new Uri($"pack://application:,,,/InkflowAdmin;component/Themes/Colors.{(theme == AppTheme.Dark ? "Dark" : "Light")}.xaml"),
        };
        // Index 0 holds the colors (see App.xaml); Theme.xaml with the styles comes after.
        if (dictionaries.Count > 0 && dictionaries[0].Source?.OriginalString.Contains("Colors.") == true)
            dictionaries[0] = colors;
        else
            dictionaries.Insert(0, colors);

        foreach (Window window in Application.Current.Windows)
            ApplyTitleBar(window);
        Changed?.Invoke();
    }

    private static AppTheme? ReadSaved()
    {
        try
        {
            return File.Exists(SettingsFile) && Enum.TryParse<AppTheme>(File.ReadAllText(SettingsFile).Trim(), out var theme)
                ? theme
                : null;
        }
        catch (IOException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static void Save(AppTheme theme)
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(SettingsFile)!);
            File.WriteAllText(SettingsFile, theme.ToString());
        }
        catch (IOException)
        {
            // Not saved: the theme still applies until the app is closed.
        }
        catch (UnauthorizedAccessException)
        {
        }
    }

    /// <summary>"Modo do aplicativo" of Windows (Configurações → Personalização → Cores).</summary>
    private static AppTheme WindowsTheme()
    {
        using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
        return key?.GetValue("AppsUseLightTheme") is int light && light == 0 ? AppTheme.Dark : AppTheme.Light;
    }

    // Dark title bar (Windows 10 20H1+ and 11); ignored where unsupported.
    private const int DwmUseImmersiveDarkMode = 20;

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    private static void ApplyTitleBar(Window window)
    {
        var handle = new WindowInteropHelper(window).Handle;
        if (handle == IntPtr.Zero) return;
        var dark = Current == AppTheme.Dark ? 1 : 0;
        DwmSetWindowAttribute(handle, DwmUseImmersiveDarkMode, ref dark, sizeof(int));
    }
}
