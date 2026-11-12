using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Media;

namespace InkflowAdmin;

/// <summary>
/// Button that switches between the light and dark themes; it always offers
/// the other theme. Used in the login window (icon only) and the sidebar.
/// </summary>
public class ThemeToggleButton : Button
{
    private static readonly FontFamily IconFont = new("Segoe MDL2 Assets");

    public ThemeToggleButton()
    {
        Click += (_, _) => ThemeManager.Toggle();
        Loaded += (_, _) =>
        {
            ThemeManager.Changed += UpdateContent;
            UpdateContent();
        };
        Unloaded += (_, _) => ThemeManager.Changed -= UpdateContent;
    }

    /// <summary>Only the icon (login window) or icon + text (sidebar).</summary>
    public bool Compact { get; set; }

    private void UpdateContent()
    {
        var dark = ThemeManager.Current == AppTheme.Dark;
        var label = dark ? "Usar tema claro" : "Usar tema escuro";
        // Segoe MDL2 Assets: E706 = sun (brightness), E708 = moon (quiet hours).
        var icon = new TextBlock { Text = dark ? "" : "", FontFamily = IconFont, FontSize = 15, VerticalAlignment = VerticalAlignment.Center };
        if (Compact)
        {
            Content = icon;
        }
        else
        {
            var panel = new StackPanel { Orientation = Orientation.Horizontal };
            panel.Children.Add(icon);
            panel.Children.Add(new TextBlock { Text = dark ? "Tema claro" : "Tema escuro", Margin = new Thickness(8, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center });
            Content = panel;
        }
        ToolTip = label;
        AutomationProperties.SetName(this, label);
    }
}
