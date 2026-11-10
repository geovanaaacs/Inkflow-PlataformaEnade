using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using InkflowAdmin.Core;
using InkflowAdmin.Core.Import;
using Microsoft.Win32;

namespace InkflowAdmin.Views;

/// <summary>Shows the area name for a slug (the list column "Área").</summary>
public sealed class AreaNameConverter : IValueConverter
{
    public static Dictionary<string, string> Names { get; } = new(StringComparer.OrdinalIgnoreCase);

    public object Convert(object value, Type targetType, object parameter, CultureInfo culture) =>
        value is string slug && Names.TryGetValue(slug, out var name) ? name : value is string s && s.Length > 0 ? s : "—";

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

/// <summary>
/// Bulk import: PDF or spreadsheet → drafts → review and approval here (or in
/// Excel, through export/import) → only approved, valid drafts are sent to
/// POST /api/admin/questions, one by one, with the outcome shown per row.
/// </summary>
public partial class ImportQuestionsWindow : Window
{
    private readonly InkflowApi _api;
    private readonly QuestionCatalog _catalog;
    private readonly ObservableCollection<QuestionDraft> _drafts = new();
    private QuestionDraftValidator _validator;
    private readonly TopicSuggester _suggester;
    private bool _importing;
    /// <summary>True while the program (not the reviewer) sets area/topic, so the "sugerido" mark stays.</summary>
    private bool _settingTopics;

    /// <param name="bank">Questions already in the bank: their codes can't be reused, and they teach the topic suggester.</param>
    public ImportQuestionsWindow(InkflowApi api, QuestionCatalog catalog, IReadOnlyList<Question> bank)
    {
        InitializeComponent();
        _api = api;
        _catalog = catalog;
        _validator = new QuestionDraftValidator(catalog.Areas.Select(a => a.Slug), bank.Select(q => q.Code));
        _suggester = new TopicSuggester(bank);

        AreaNameConverter.Names.Clear();
        foreach (var area in catalog.Areas) AreaNameConverter.Names[area.Slug] = area.ShortName;

        var areaOptions = catalog.Areas.Select(a => new Option(a.Slug, a.Name)).ToList();
        DefaultArea.ItemsSource = areaOptions;
        DefaultArea.SelectedIndex = 0;
        EditorArea.ItemsSource = areaOptions;
        DefaultDifficulty.ItemsSource = Labels.Difficulties;
        DefaultDifficulty.SelectedItem = "médio";
        EditorDifficulty.ItemsSource = Labels.Difficulties;
        EditorCorrect.ItemsSource = new[] { new Option("", "— não informada —") }
            .Concat(QuestionDraft.Letters.Select(l => new Option(l, l.ToUpperInvariant())))
            .ToList();
        DefaultYear.Text = DateTime.Now.Year.ToString();
        DefaultTopic.Text = "";

        DraftsGrid.ItemsSource = _drafts;
        UpdateSummary();
    }

    /// <summary>How many questions were created (to refresh the list after closing).</summary>
    public int ImportedCount => _drafts.Count(d => d.Imported);

    /* ------------------------------------------------------------ Open */

    private async void OnOpenPdf(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog { Title = "Abrir PDF de questões", Filter = "PDF (*.pdf)|*.pdf" };
        if (dialog.ShowDialog(this) != true || !ConfirmReplace()) return;
        if (!TryReadDefaults(out var defaults)) return;

        await Load(() => QuestionTextParser.Parse(PdfTextExtractor.ReadLines(dialog.FileName), defaults), Path.GetFileName(dialog.FileName), onlyMissingTopic: false,
            emptyMessage: "Nenhuma questão foi encontrada no PDF. O importador procura cabeçalhos como \"QUESTÃO 12\" (ou \"12.\") e alternativas A–E. Se o formato for diferente, use a planilha modelo.");
    }

    private async void OnOpenSheet(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog { Title = "Abrir planilha de questões", Filter = "Planilha (*.xlsx;*.csv)|*.xlsx;*.csv" };
        if (dialog.ShowDialog(this) != true || !ConfirmReplace()) return;
        await Load(() => QuestionSheet.Read(dialog.FileName, _catalog.Areas), Path.GetFileName(dialog.FileName), onlyMissingTopic: true,
            emptyMessage: "A planilha não tem nenhuma questão preenchida.");
    }

    /// <param name="onlyMissingTopic">Spreadsheet: keep the topics typed there and suggest only the missing ones.</param>
    private async Task Load(Func<List<QuestionDraft>> read, string fileName, bool onlyMissingTopic, string emptyMessage)
    {
        Summary.Text = $"Lendo {fileName}…";
        List<QuestionDraft> drafts;
        try
        {
            // PDFs can be large: read (and suggest topics) outside the UI thread.
            drafts = await Task.Run(() =>
            {
                var found = read();
                _suggester.Apply(found, onlyMissingTopic);
                return found;
            });
        }
        catch (InvalidDataException error)
        {
            MessageBox.Show(this, error.Message, "Não foi possível ler o arquivo", MessageBoxButton.OK, MessageBoxImage.Warning);
            UpdateSummary();
            return;
        }
        if (drafts.Count == 0)
        {
            MessageBox.Show(this, emptyMessage, "Nada encontrado", MessageBoxButton.OK, MessageBoxImage.Information);
            UpdateSummary();
            return;
        }

        foreach (var old in _drafts) old.PropertyChanged -= OnDraftChanged;
        _drafts.Clear();
        foreach (var draft in drafts)
        {
            draft.PropertyChanged += OnDraftChanged;
            _drafts.Add(draft);
        }
        Revalidate();
        DraftsGrid.SelectedIndex = 0;
    }

    private bool ConfirmReplace()
    {
        var pending = _drafts.Count(d => !d.Imported);
        return pending == 0 || MessageBox.Show(this,
            $"Há {pending} questões nesta revisão que ainda não foram importadas. Abrir outro arquivo descarta essas questões. Continuar?",
            "Abrir outro arquivo", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes;
    }

    /* ------------------------------------------------------------ Review */

    private void OnDraftChanged(object? sender, PropertyChangedEventArgs e)
    {
        // Editing a field re-checks everything (codes can collide with other rows).
        if (e.PropertyName is nameof(QuestionDraft.Problems) or nameof(QuestionDraft.IsValid) or nameof(QuestionDraft.StatusLabel)
            or nameof(QuestionDraft.Result) or nameof(QuestionDraft.Preview)) return;
        if (e.PropertyName == nameof(QuestionDraft.Approved)) { UpdateSummary(); return; }
        if (e.PropertyName == nameof(QuestionDraft.TopicOrigin)) return;
        if (e.PropertyName is nameof(QuestionDraft.AreaSlug) or nameof(QuestionDraft.Topic) && sender is QuestionDraft draft)
        {
            // The reviewer changed it: no longer a suggestion.
            if (!_settingTopics && draft.TopicOrigin.Length > 0) draft.TopicOrigin = "";
            if (e.PropertyName == nameof(QuestionDraft.AreaSlug) && ReferenceEquals(draft, Editor.DataContext)) FillTopicChoices(draft);
        }
        Revalidate();
    }

    private void Revalidate()
    {
        _validator.ValidateAll(_drafts);
        UpdateSummary();
    }

    private void OnSelect(object sender, SelectionChangedEventArgs e)
    {
        var draft = DraftsGrid.SelectedItem as QuestionDraft;
        Editor.DataContext = draft;
        if (draft is not null) FillTopicChoices(draft);
        // Imported questions are done: edit them in the Questões screen.
        Editor.IsEnabled = draft is not null && !draft.Imported && !_importing;
    }

    /// <summary>Topics already used in the draft's area, offered in the editor's topic box.</summary>
    private void FillTopicChoices(QuestionDraft draft)
    {
        var typed = draft.Topic;
        EditorTopic.ItemsSource = _catalog.TopicsByArea.TryGetValue(draft.AreaSlug, out var topics) ? topics : new List<string>();
        if (EditorTopic.Text != typed) EditorTopic.Text = typed;
    }

    private void OnSuggestTopics(object sender, RoutedEventArgs e)
    {
        if (_drafts.Count == 0) return;
        int suggested;
        _settingTopics = true;
        try
        {
            suggested = _suggester.Apply(_drafts, onlyMissingTopic: false);
        }
        finally
        {
            _settingTopics = false;
        }
        Revalidate();
        var pending = _drafts.Count(d => !d.Imported && d.TopicOrigin != "do PDF");
        MessageBox.Show(this,
            $"{suggested} de {pending} questões receberam uma sugestão de área e tópico.\n\n"
            + "As sugestões aparecem como \"(sugerido)\" na lista: confira antes de aprovar. As demais ficam com o tópico padrão.",
            "Sugerir tópicos", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private bool TryReadDefaults(out DraftDefaults defaults)
    {
        defaults = default!;
        if (!int.TryParse(DefaultYear.Text, out var year))
        {
            MessageBox.Show(this, "Informe o ano padrão com quatro dígitos (ele também forma o código, ex.: Q2025-12).", "Ano padrão", MessageBoxButton.OK, MessageBoxImage.Information);
            return false;
        }
        defaults = new DraftDefaults((string?)DefaultArea.SelectedValue ?? "", DefaultTopic.Text.Trim(), year, DefaultDifficulty.SelectedItem as string ?? "médio");
        return true;
    }

    private void OnApplyDefaults(object sender, RoutedEventArgs e)
    {
        if (_drafts.Count == 0 || !TryReadDefaults(out var defaults)) return;
        _settingTopics = true;
        foreach (var draft in _drafts.Where(d => !d.Imported))
        {
            var areaChanged = draft.AreaSlug != defaults.AreaSlug;
            draft.AreaSlug = defaults.AreaSlug;
            // A topic belongs to an area: with a new area and no default topic, use "Geral" there
            // (keeping, say, "Normalização de Dados" would create it inside the wrong area).
            if (defaults.Topic.Length > 0) draft.Topic = defaults.Topic;
            else if (areaChanged) draft.Topic = TopicSuggester.GeneralTopic;
            draft.TopicOrigin = draft.Topic.Length > 0 ? "padrão" : "";
            draft.Difficulty = defaults.Difficulty;
            draft.Year = defaults.Year;
            // Q2023-12 → Q2025-12: keep the question number, change the year.
            var dash = draft.Code.IndexOf('-');
            if (draft.Code.StartsWith('Q') && dash > 0) draft.Code = $"Q{defaults.Year}{draft.Code[dash..]}";
        }
        _settingTopics = false;
        Revalidate();
    }

    private void OnApproveAll(object sender, RoutedEventArgs e)
    {
        foreach (var draft in _drafts.Where(d => d.IsValid && !d.Imported)) draft.Approved = true;
    }

    private void UpdateSummary()
    {
        var pending = _drafts.Where(d => !d.Imported).ToList();
        var ready = pending.Count(d => d.IsValid);
        var toImport = pending.Count(d => d.Approved && d.IsValid);
        var imported = _drafts.Count - pending.Count;

        EmptyHint.Visibility = _drafts.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        ExportButton.IsEnabled = ApproveAllButton.IsEnabled = _drafts.Count > 0 && !_importing;
        ImportButton.IsEnabled = toImport > 0 && !_importing;
        ImportButton.Content = toImport == 1 ? "Importar 1 questão aprovada" : $"Importar {toImport} questões aprovadas";
        Summary.Text = _drafts.Count == 0
            ? ""
            : $"{_drafts.Count} questões · {ready} prontas · {pending.Count - ready} para corrigir · {pending.Count(d => d.Approved)} aprovadas"
              + (imported > 0 ? $" · {imported} importadas" : "");
    }

    /* ------------------------------------------------------------ Spreadsheet */

    private void OnExport(object sender, RoutedEventArgs e)
    {
        var dialog = new SaveFileDialog
        {
            Title = "Exportar questões para revisar",
            Filter = "Excel (*.xlsx)|*.xlsx|CSV (*.csv)|*.csv",
            FileName = "questoes-para-revisar.xlsx",
        };
        if (dialog.ShowDialog(this) != true) return;
        try
        {
            QuestionSheet.Write(dialog.FileName, _drafts.Where(d => !d.Imported));
            MessageBox.Show(this,
                $"Planilha salva em:\n{dialog.FileName}\n\nRevise e corrija no Excel, marque \"sim\" na coluna aprovar e depois use \"Abrir planilha\" para trazer de volta.",
                "Exportado", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        {
            MessageBox.Show(this, $"Não foi possível salvar: {error.Message}\nSe o arquivo estiver aberto no Excel, feche-o.", "Erro ao exportar", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void OnTemplate(object sender, RoutedEventArgs e)
    {
        var dialog = new SaveFileDialog { Title = "Salvar modelo de planilha", Filter = "Excel (*.xlsx)|*.xlsx|CSV (*.csv)|*.csv", FileName = "modelo-questoes.xlsx" };
        if (dialog.ShowDialog(this) != true) return;
        try
        {
            QuestionSheet.WriteTemplate(dialog.FileName);
            MessageBox.Show(this,
                "Modelo salvo. Preencha uma questão por linha (a coluna \"area\" aceita o nome ou o código da área; \"correta\" é a letra de a até e) e use \"Abrir planilha\".",
                "Modelo de planilha", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        {
            MessageBox.Show(this, $"Não foi possível salvar: {error.Message}", "Erro", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    /* ------------------------------------------------------------ Import */

    private async void OnImport(object sender, RoutedEventArgs e)
    {
        var batch = _drafts.Where(d => d.Approved && d.IsValid && !d.Imported).ToList();
        var skipped = _drafts.Count(d => d.Approved && !d.IsValid && !d.Imported);
        var message = $"Gravar {batch.Count} {(batch.Count == 1 ? "questão" : "questões")} no banco de questões?"
                      + (skipped > 0 ? $"\n\n{skipped} aprovadas com problemas ficam de fora até serem corrigidas." : "");
        if (MessageBox.Show(this, message, "Importar questões", MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes) return;

        _importing = true;
        Editor.IsEnabled = false;
        UpdateSummary();
        int ok = 0, failed = 0;
        foreach (var draft in batch)
        {
            Summary.Text = $"Importando {ok + failed + 1} de {batch.Count}…";
            try
            {
                await _api.CreateQuestionAsync(draft.ToInput());
                _validator.MarkImported(draft.Code);
                draft.Result = QuestionDraft.ImportedLabel;
                ok++;
            }
            catch (ApiException error)
            {
                // E.g. 409 "Já existe uma questão com o código ..." — the row keeps the message.
                draft.Result = error.Message;
                failed++;
                if (error.Status is 0 or 401) break; // API down or session expired: stop here
            }
        }
        _importing = false;
        Revalidate();
        OnSelect(this, null!);
        MessageBox.Show(this,
            $"{ok} {(ok == 1 ? "questão importada" : "questões importadas")}." + (failed > 0 ? $"\n{failed} com erro: veja a coluna Situação." : ""),
            "Importação concluída", MessageBoxButton.OK, failed > 0 ? MessageBoxImage.Warning : MessageBoxImage.Information);
    }

    private void OnClosing(object? sender, CancelEventArgs e)
    {
        if (_importing)
        {
            e.Cancel = true;
            return;
        }
        var pendingApproved = _drafts.Count(d => d.Approved && !d.Imported);
        if (pendingApproved > 0 && MessageBox.Show(this,
                $"{pendingApproved} questões aprovadas ainda não foram importadas. Fechar mesmo assim?",
                "Fechar importação", MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes)
        {
            e.Cancel = true;
        }
    }
}
