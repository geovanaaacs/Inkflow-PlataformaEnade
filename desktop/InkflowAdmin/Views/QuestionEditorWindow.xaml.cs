using System.Windows;
using System.Windows.Controls;
using InkflowAdmin.Core;

namespace InkflowAdmin.Views;

/// <summary>Create (question = null) or edit a question. Same fields and rules as the web admin form.</summary>
public partial class QuestionEditorWindow : Window
{
    private static readonly string[] Letters = ["a", "b", "c", "d", "e"];

    private readonly InkflowApi _api;
    private readonly QuestionCatalog _catalog;
    private readonly Question? _question;
    private readonly List<(RadioButton Correct, TextBox Text)> _options = new();

    public QuestionEditorWindow(InkflowApi api, QuestionCatalog catalog, Question? question)
    {
        InitializeComponent();
        _api = api;
        _catalog = catalog;
        _question = question;

        Title = question is null ? "Nova questão" : $"Editar questão {question.Code}";
        Heading.Text = Title;
        SaveButton.Content = question is null ? "Criar questão" : "Salvar alterações";

        DifficultyBox.ItemsSource = Labels.Difficulties;
        AreaBox.ItemsSource = catalog.Areas.Select(a => new Option(a.Slug, a.Name)).ToList();
        BuildOptions();
        Fill();
    }

    /// <summary>The API result, available after a successful save.</summary>
    public Question? Saved { get; private set; }

    private void BuildOptions()
    {
        foreach (var letter in Letters)
        {
            var radio = new RadioButton
            {
                GroupName = "Correct",
                Content = letter.ToUpperInvariant() + ")",
                FontWeight = FontWeights.SemiBold,
                VerticalAlignment = VerticalAlignment.Center,
                Width = 44,
                ToolTip = $"Alternativa {letter.ToUpperInvariant()} é a correta",
            };
            var text = new TextBox { TextWrapping = TextWrapping.Wrap, AcceptsReturn = false };
            var row = new DockPanel { Margin = new Thickness(0, 0, 0, 8) };
            DockPanel.SetDock(radio, Dock.Left);
            row.Children.Add(radio);
            row.Children.Add(text);
            OptionsPanel.Children.Add(row);
            _options.Add((radio, text));
        }
    }

    private void Fill()
    {
        if (_question is null)
        {
            YearBox.Text = DateTime.Now.Year.ToString();
            DifficultyBox.SelectedItem = "médio";
            AreaBox.SelectedIndex = 0;
            return;
        }
        CodeBox.Text = _question.Code;
        YearBox.Text = _question.Year.ToString();
        DifficultyBox.SelectedItem = _question.Difficulty;
        AreaBox.SelectedItem = ((IEnumerable<Option>)AreaBox.ItemsSource).FirstOrDefault(o => o.Value == _question.Area.Slug);
        TopicBox.Text = _question.Topic;
        StatementBox.Text = _question.Statement;
        ExplanationBox.Text = _question.AiExplanation;
        for (var index = 0; index < _options.Count; index++)
        {
            var option = _question.Options.FirstOrDefault(o => o.Id == Letters[index]);
            _options[index].Text.Text = option?.Label ?? "";
            _options[index].Correct.IsChecked = Letters[index] == _question.CorrectOptionId;
        }
    }

    /// <summary>Topics already used in the chosen area, as suggestions.</summary>
    private void OnAreaChanged(object sender, SelectionChangedEventArgs e)
    {
        var slug = (AreaBox.SelectedItem as Option)?.Value;
        var typed = TopicBox.Text;
        TopicBox.ItemsSource = slug is not null && _catalog.TopicsByArea.TryGetValue(slug, out var topics) ? topics : new List<string>();
        TopicBox.Text = typed;
    }

    private async void OnSave(object sender, RoutedEventArgs e)
    {
        var correctIndex = _options.FindIndex(o => o.Correct.IsChecked == true);
        if (correctIndex < 0)
        {
            ShowError("Marque qual alternativa é a correta.");
            return;
        }
        if (!int.TryParse(YearBox.Text, out var year))
        {
            ShowError("Informe o ano com quatro dígitos.");
            return;
        }

        // Everything else (code format, year range, empty fields) is checked by the API with the same messages as the web.
        var input = new QuestionInput(
            CodeBox.Text.Trim(),
            (AreaBox.SelectedItem as Option)?.Value ?? "",
            TopicBox.Text.Trim(),
            year,
            DifficultyBox.SelectedItem as string ?? "médio",
            StatementBox.Text.Trim(),
            _options.Select(o => o.Text.Text.Trim()).ToList(),
            Letters[correctIndex],
            ExplanationBox.Text.Trim());

        SaveButton.IsEnabled = false;
        ErrorText.Visibility = Visibility.Collapsed;
        try
        {
            Saved = _question is null
                ? await _api.CreateQuestionAsync(input)
                : await _api.UpdateQuestionAsync(_question.Id, input);
            DialogResult = true;
        }
        catch (ApiException error)
        {
            ShowError(error.Message);
            SaveButton.IsEnabled = true;
        }
    }

    /// <summary>Asks the API (Google Gemini) for a short explanation; without a marked answer, also for the answer.</summary>
    private async void OnGenerateExplanation(object sender, RoutedEventArgs e)
    {
        var statement = StatementBox.Text.Trim();
        var options = _options.Select(o => o.Text.Text.Trim()).ToList();
        if (statement.Length < 10 || options.Any(string.IsNullOrEmpty))
        {
            ShowAiStatus("Preencha o enunciado e as cinco alternativas antes de pedir a explicação.", isError: true);
            return;
        }
        if (!string.IsNullOrWhiteSpace(ExplanationBox.Text) &&
            MessageBox.Show(this, "Substituir a explicação atual pela da IA?", "Gerar com IA",
                MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes)
        {
            return;
        }

        var correctIndex = _options.FindIndex(o => o.Correct.IsChecked == true);
        AiButton.IsEnabled = false;
        ShowAiStatus("Gerando explicação com IA…", isError: false);
        try
        {
            var result = await _api.ExplainQuestionAsync(statement, options, correctIndex >= 0 ? Letters[correctIndex] : null);
            ExplanationBox.Text = result.Explanation;
            if (result.SuggestedByAi)
            {
                var index = Array.IndexOf(Letters, result.CorrectOptionId);
                if (index >= 0) _options[index].Correct.IsChecked = true;
                ShowAiStatus($"A IA marcou a alternativa {result.CorrectOptionId.ToUpperInvariant()} como correta: confira antes de salvar.", isError: false);
            }
            else
            {
                ShowAiStatus("Explicação gerada pela IA: revise o texto antes de salvar.", isError: false);
            }
        }
        catch (ApiException error)
        {
            ShowAiStatus(error.Message, isError: true);
        }
        finally
        {
            AiButton.IsEnabled = true;
        }
    }

    private void ShowAiStatus(string message, bool isError)
    {
        AiStatus.Text = message;
        // Resource reference (not the brush itself), so the color follows a theme switch.
        AiStatus.SetResourceReference(TextBlock.ForegroundProperty, isError ? "Danger" : "BrandText");
        AiStatus.Visibility = Visibility.Visible;
    }

    private void ShowError(string message)
    {
        ErrorText.Text = message;
        ErrorText.Visibility = Visibility.Visible;
    }
}
