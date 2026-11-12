using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;

namespace InkflowAdmin.Core.Import;

/// <summary>
/// A question read from a PDF or a spreadsheet, waiting for review. Every field
/// can be edited on screen; only approved drafts without problems are sent to
/// the API. Notifies changes so the review grid and the editor stay in sync.
/// </summary>
public sealed class QuestionDraft : INotifyPropertyChanged
{
    public static readonly string[] Letters = ["a", "b", "c", "d", "e"];

    private bool _approved;
    private string _code = "";
    private string _areaSlug = "";
    private string _topic = "";
    private int _year;
    private string _difficulty = "médio";
    private string _statement = "";
    private string _optionA = "", _optionB = "", _optionC = "", _optionD = "", _optionE = "";
    private string _correct = "";
    private string _explanation = "";
    private string _problems = "";
    private string _result = "";

    public event PropertyChangedEventHandler? PropertyChanged;

    /// <summary>Where it came from ("PDF, página 2, questão 12" or "planilha, linha 5").</summary>
    public string Source { get; init; } = "";

    /// <summary>Marked by the reviewer: only approved drafts are imported.</summary>
    public bool Approved { get => _approved; set => Set(ref _approved, value); }

    public string Code { get => _code; set => Set(ref _code, (value ?? "").Trim().ToUpperInvariant()); }
    public string AreaSlug { get => _areaSlug; set => Set(ref _areaSlug, value ?? ""); }
    public string Topic { get => _topic; set => Set(ref _topic, value ?? ""); }
    public int Year { get => _year; set => Set(ref _year, value); }
    public string Difficulty { get => _difficulty; set => Set(ref _difficulty, value ?? ""); }
    public string Statement { get => _statement; set => Set(ref _statement, value ?? ""); }
    public string OptionA { get => _optionA; set => Set(ref _optionA, value ?? ""); }
    public string OptionB { get => _optionB; set => Set(ref _optionB, value ?? ""); }
    public string OptionC { get => _optionC; set => Set(ref _optionC, value ?? ""); }
    public string OptionD { get => _optionD; set => Set(ref _optionD, value ?? ""); }
    public string OptionE { get => _optionE; set => Set(ref _optionE, value ?? ""); }

    /// <summary>Correct option letter (a–e), or empty when the PDF had no answer key.</summary>
    public string Correct { get => _correct; set => Set(ref _correct, (value ?? "").Trim().ToLowerInvariant()); }

    public string Explanation { get => _explanation; set => Set(ref _explanation, value ?? ""); }

    private string _correctOrigin = "";

    /// <summary>
    /// "sugerida pela IA — confira" when the PDF had no answer key and the AI chose it;
    /// empty once the reviewer picks the answer by hand.
    /// </summary>
    public string CorrectOrigin { get => _correctOrigin; set => Set(ref _correctOrigin, value ?? ""); }

    /// <summary>Has statement and the five options: enough to ask the AI for an explanation.</summary>
    public bool CanAskAi =>
        Statement.Trim().Length >= 10 && new[] { OptionA, OptionB, OptionC, OptionD, OptionE }.All(o => o.Trim().Length > 0);

    private string _topicOrigin = "";

    /// <summary>
    /// Where the area/topic came from, shown next to the topic: "do PDF",
    /// "sugerido: parecido com Q2024-34 (64%)", "padrão" — empty once the reviewer edits them.
    /// </summary>
    public string TopicOrigin { get => _topicOrigin; set => Set(ref _topicOrigin, value ?? ""); }

    /// <summary>"Linguagem SQL (sugerido)" for the list.</summary>
    public string TopicLabel => TopicOrigin.StartsWith("sugerido") ? $"{Topic} (sugerido)" : Topic;

    /// <summary>What still blocks the import (filled by <see cref="QuestionDraftValidator"/>).</summary>
    public string Problems
    {
        get => _problems;
        set
        {
            if (Set(ref _problems, value ?? ""))
            {
                OnChanged(nameof(IsValid));
                OnChanged(nameof(StatusLabel));
            }
        }
    }

    /// <summary>Outcome of the import ("Importada" or the API's message).</summary>
    public string Result { get => _result; set { if (Set(ref _result, value ?? "")) OnChanged(nameof(StatusLabel)); } }

    public bool IsValid => Problems.Length == 0;
    public bool Imported => Result == ImportedLabel;
    public const string ImportedLabel = "Importada";

    public string StatusLabel => Imported ? "✓ Importada" : Result.Length > 0 ? "✗ " + Result : IsValid ? "Pronta" : "Corrigir";

    /// <summary>First line of the statement, for the list.</summary>
    public string Preview
    {
        get
        {
            var flat = Regex.Replace(Statement, @"\s+", " ").Trim();
            return flat.Length > 120 ? flat[..117] + "…" : flat;
        }
    }

    public List<string> Options => [OptionA, OptionB, OptionC, OptionD, OptionE];

    public void SetOption(string letter, string text)
    {
        switch (letter)
        {
            case "a": OptionA = text; break;
            case "b": OptionB = text; break;
            case "c": OptionC = text; break;
            case "d": OptionD = text; break;
            case "e": OptionE = text; break;
        }
    }

    public QuestionInput ToInput() => new(
        Code, AreaSlug, Topic.Trim(), Year, Difficulty, Statement.Trim(),
        Options.Select(o => o.Trim()).ToList(), Correct, Explanation.Trim());

    private bool Set<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return false;
        field = value;
        OnChanged(name!);
        if (name == nameof(Statement)) OnChanged(nameof(Preview));
        if (name is nameof(Topic) or nameof(TopicOrigin)) OnChanged(nameof(TopicLabel));
        return true;
    }

    private void OnChanged(string name) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}

/// <summary>Defaults applied to every draft read from a PDF (the PDF doesn't say area, topic or difficulty).</summary>
public sealed record DraftDefaults(string AreaSlug, string Topic, int Year, string Difficulty);
