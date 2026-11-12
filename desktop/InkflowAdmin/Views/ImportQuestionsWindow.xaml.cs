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
    /// <summary>True while the AI fills a draft, so its "sugerida pela IA" mark stays.</summary>
    private bool _settingByAi;
    private bool _aiRunning;
    private bool _aiStop;

    private const string AiSuggestedLabel = "sugerida pela IA — confira";
    /// <summary>Pause between AI calls in "Explicar todas" (free tier: few requests per minute).</summary>
    private static readonly TimeSpan AiPause = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan AiRateLimitWait = TimeSpan.FromSeconds(60);

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
        if (e.PropertyName is nameof(QuestionDraft.TopicOrigin) or nameof(QuestionDraft.CorrectOrigin)) return;
        // The reviewer picked the answer by hand: no longer the AI's suggestion.
        if (e.PropertyName == nameof(QuestionDraft.Correct) && !_settingByAi && sender is QuestionDraft changed) changed.CorrectOrigin = "";
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
        AiAllButton.IsEnabled = _drafts.Count > 0 && !_importing;
        AnswerKeyButton.IsEnabled = _drafts.Count > 0 && !_importing && !_aiRunning;
        AiAllButton.Content = _aiRunning ? "■  Parar a IA" : "✨  Explicar todas com IA";
        ImportButton.IsEnabled = toImport > 0 && !_importing && !_aiRunning;
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

    /* ------------------------------------------------------------ Official answer key (INEP) */

    private const string AnswerKeyLabel = "do gabarito oficial";
    private const string AnnulledLabel = "ANULADA no gabarito oficial — não importe";
    private static readonly System.Text.RegularExpressions.Regex SourceNumber = new(@"quest[aã]o (\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    /// <summary>Question number in the test: from where it was read ("PDF, página 3, questão 12"), else from the code (Q2021-12).</summary>
    private static int? QuestionNumberOf(QuestionDraft draft)
    {
        var fromSource = SourceNumber.Match(draft.Source);
        if (fromSource.Success) return int.Parse(fromSource.Groups[1].Value);
        var dash = draft.Code.LastIndexOf('-');
        return dash >= 0 && int.TryParse(draft.Code[(dash + 1)..], out var number) ? number : null;
    }

    /// <summary>
    /// Fills the correct option of each question from the INEP answer key PDF (a
    /// separate file from the test), marks the annulled ones, and offers to drop
    /// the general-knowledge questions (1 to 8) of the ENADE.
    /// </summary>
    private async void OnOpenAnswerKey(object sender, RoutedEventArgs e)
    {
        if (_drafts.Count == 0) return;
        var dialog = new OpenFileDialog { Title = "Abrir o PDF de gabarito do INEP", Filter = "PDF (*.pdf)|*.pdf" };
        if (dialog.ShowDialog(this) != true) return;

        List<AnswerKeyEntry> key;
        Summary.Text = $"Lendo o gabarito {Path.GetFileName(dialog.FileName)}…";
        try
        {
            key = await Task.Run(() => AnswerKeyReader.Read(dialog.FileName));
        }
        catch (InvalidDataException error)
        {
            MessageBox.Show(this, error.Message, "Não foi possível ler o gabarito", MessageBoxButton.OK, MessageBoxImage.Warning);
            UpdateSummary();
            return;
        }

        var byNumber = key.ToDictionary(entry => entry.Number);
        int filled = 0, changed = 0, annulled = 0, missing = 0, aiReplaced = 0;
        foreach (var draft in _drafts.Where(d => !d.Imported))
        {
            if (QuestionNumberOf(draft) is not int number || !byNumber.TryGetValue(number, out var entry))
            {
                missing++;
                continue;
            }
            if (entry.Annulled)
            {
                draft.Correct = "";
                draft.Approved = false;
                draft.CorrectOrigin = AnnulledLabel;
                annulled++;
                continue;
            }
            var wasAi = draft.CorrectOrigin == AiSuggestedLabel;
            if (draft.Correct.Length > 0 && draft.Correct != entry.Letter)
            {
                changed++;
                // The AI explained another option: that explanation no longer fits.
                if (wasAi && draft.Explanation.Length > 0)
                {
                    draft.Explanation = "";
                    aiReplaced++;
                }
            }
            draft.Correct = entry.Letter!;
            draft.CorrectOrigin = AnswerKeyLabel; // after Correct: changing Correct clears the mark
            filled++;
        }
        Revalidate();

        var message = $"Gabarito lido: {key.Count} respostas.\n\n"
                      + $"{filled} {(filled == 1 ? "questão recebeu" : "questões receberam")} a alternativa correta"
                      + (changed > 0 ? $" ({changed} estavam com outra letra e foram corrigidas)" : "") + "."
                      + (annulled > 0 ? $"\n{annulled} {(annulled == 1 ? "questão está anulada" : "questões estão anuladas")}: ficam marcadas e não podem ser importadas." : "")
                      + (aiReplaced > 0 ? $"\n{aiReplaced} explicações da IA eram de outra alternativa e foram apagadas: gere de novo." : "")
                      + (missing > 0 ? $"\n{missing} {(missing == 1 ? "questão não está" : "questões não estão")} no gabarito (confira se é o gabarito desta prova)." : "");
        MessageBox.Show(this, message, "Gabarito oficial", MessageBoxButton.OK, missing > 0 ? MessageBoxImage.Warning : MessageBoxImage.Information);

        // ENADE: questions 1-8 are "Formação Geral" (general knowledge, not IT).
        var general = _drafts.Where(d => !d.Imported && QuestionNumberOf(d) is >= 1 and <= 8).ToList();
        if (key.Count >= 30 && general.Count > 0 &&
            MessageBox.Show(this,
                $"No ENADE, as questões 1 a 8 são de Formação Geral (conhecimentos gerais, fora de TI). Tirar estas {general.Count} da revisão?",
                "Formação Geral", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
        {
            foreach (var draft in general)
            {
                draft.PropertyChanged -= OnDraftChanged;
                _drafts.Remove(draft);
            }
            Revalidate();
        }
    }

    /* ------------------------------------------------------------ AI explanation */

    /// <summary>Fills the draft's explanation (and, without an answer key, the AI's answer). Throws ApiException.</summary>
    private async Task ExplainDraftAsync(QuestionDraft draft)
    {
        var options = new[] { draft.OptionA, draft.OptionB, draft.OptionC, draft.OptionD, draft.OptionE }.Select(o => o.Trim()).ToList();
        var result = await _api.ExplainQuestionAsync(draft.Statement.Trim(), options, string.IsNullOrEmpty(draft.Correct) ? null : draft.Correct);
        _settingByAi = true;
        try
        {
            draft.Explanation = result.Explanation;
            if (result.SuggestedByAi)
            {
                draft.Correct = result.CorrectOptionId;
                draft.CorrectOrigin = AiSuggestedLabel;
            }
        }
        finally
        {
            _settingByAi = false;
        }
    }

    private async void OnExplainSelected(object sender, RoutedEventArgs e)
    {
        if (Editor.DataContext is not QuestionDraft draft) return;
        if (!draft.CanAskAi)
        {
            MessageBox.Show(this, "Preencha o enunciado e as cinco alternativas antes de pedir a explicação.", "Gerar com IA", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }
        if (draft.Explanation.Trim().Length > 0 &&
            MessageBox.Show(this, "Substituir a explicação atual pela da IA?", "Gerar com IA", MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes)
        {
            return;
        }

        EditorAiButton.IsEnabled = false;
        Summary.Text = $"Gerando a explicação de {draft.Code} com IA…";
        try
        {
            await ExplainDraftAsync(draft);
        }
        catch (ApiException error)
        {
            MessageBox.Show(this, error.Message, "Gerar com IA", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
        finally
        {
            EditorAiButton.IsEnabled = true;
            UpdateSummary();
        }
    }

    /// <summary>
    /// Explains every pending draft that has no explanation yet, one at a time with a
    /// pause (free tier limits). Waits and retries once on "limit reached"; the same
    /// button stops it.
    /// </summary>
    private async void OnExplainAll(object sender, RoutedEventArgs e)
    {
        if (_aiRunning)
        {
            _aiStop = true;
            Summary.Text = "Parando a IA depois da questão atual…";
            return;
        }

        var targets = _drafts.Where(d => !d.Imported && d.Explanation.Trim().Length == 0 && d.CanAskAi).ToList();
        var incomplete = _drafts.Count(d => !d.Imported && d.Explanation.Trim().Length == 0 && !d.CanAskAi);
        if (targets.Count == 0)
        {
            MessageBox.Show(this,
                incomplete > 0
                    ? $"As questões sem explicação ({incomplete}) ainda não têm o enunciado e as cinco alternativas completos."
                    : "Todas as questões já têm explicação. Para refazer uma, use \"Gerar com IA\" no editor.",
                "Explicar com IA", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }
        var minutes = Math.Max(1, (int)Math.Ceiling(targets.Count * (AiPause.TotalSeconds + 4) / 60));
        if (MessageBox.Show(this,
                $"Gerar a explicação de {targets.Count} {(targets.Count == 1 ? "questão" : "questões")} com IA (Google Gemini)?\n\n"
                + $"Uma de cada vez, por causa do limite gratuito: leva cerca de {minutes} min. Questões sem gabarito recebem a alternativa sugerida pela IA, marcada para você conferir.\n\n"
                + "Revise os textos antes de aprovar.",
                "Explicar com IA", MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes)
        {
            return;
        }

        _aiRunning = true;
        _aiStop = false;
        UpdateSummary();
        int done = 0, failed = 0;
        string? stoppedBy = null;
        for (var index = 0; index < targets.Count && !_aiStop; index++)
        {
            var draft = targets[index];
            Summary.Text = $"IA: questão {index + 1} de {targets.Count} ({draft.Code})…";
            try
            {
                await ExplainDraftAsync(draft);
                done++;
            }
            catch (ApiException error) when (error.Status == 429)
            {
                // Free-tier limit: wait a minute, then try this question once more.
                for (var left = (int)AiRateLimitWait.TotalSeconds; left > 0 && !_aiStop; left--)
                {
                    Summary.Text = $"Limite gratuito da IA: continuando em {left} s… ({done} de {targets.Count} prontas)";
                    await Task.Delay(1000);
                }
                if (_aiStop) break;
                try
                {
                    await ExplainDraftAsync(draft);
                    done++;
                }
                catch (ApiException again)
                {
                    stoppedBy = again.Message;
                    break;
                }
            }
            catch (ApiException error) when (error.Status is 0 or 401 or 503)
            {
                // API down, session expired or AI not configured: no point in going on.
                stoppedBy = error.Message;
                break;
            }
            catch (ApiException)
            {
                failed++; // this question only; the next one may work
            }
            if (index < targets.Count - 1 && !_aiStop) await Task.Delay(AiPause);
        }

        _aiRunning = false;
        UpdateSummary();
        var text = $"{done} de {targets.Count} {(targets.Count == 1 ? "questão recebeu" : "questões receberam")} explicação da IA."
                   + (failed > 0 ? $"\n{failed} não deram certo: tente de novo pelo botão do editor." : "")
                   + (stoppedBy is not null ? $"\n\nParou: {stoppedBy}" : _aiStop ? "\n\nParado por você." : "")
                   + "\n\nRevise os textos (e as alternativas marcadas como \"sugerida pela IA\") antes de aprovar.";
        MessageBox.Show(this, text, "Explicar com IA", MessageBoxButton.OK, stoppedBy is null ? MessageBoxImage.Information : MessageBoxImage.Warning);
    }

    /* ------------------------------------------------------------ Import */

    private async void OnImport(object sender, RoutedEventArgs e)
    {
        if (_aiRunning) return;
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
        if (_aiRunning)
        {
            // Let the loop finish the current question before the window goes away.
            _aiStop = true;
            e.Cancel = true;
            Summary.Text = "Parando a IA… feche de novo em instantes.";
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
