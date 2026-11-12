using System.Text;
using System.Text.RegularExpressions;

namespace InkflowAdmin.Core.Import;

/// <summary>A line of text and the page it came from.</summary>
public sealed record SourceLine(int Page, string Text);

/// <summary>
/// Turns the text of a test (PDF) into question drafts. Best effort by design:
/// whatever it can't tell (area, topic, sometimes the answer) is left for the
/// reviewer, and every draft is checked again before the import.
///
/// Recognizes:
///   - question starts: "QUESTÃO 12" (ENADE) or, if there is none, "12." / "12)" at the start of a line;
///   - options: "A)", "(A)", "A.", "a)" or the ENADE style "A   texto" / a letter alone on its line;
///   - answer key: a "GABARITO" section ("1 - B", "2) D", "03 E"…) or a line "Gabarito: B" / "Resposta: B" inside the question.
/// </summary>
public static class QuestionTextParser
{
    private const RegexOptions Options = RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled;

    private static readonly Regex ExamHeading = new(@"^QUEST[ÃA]O\s*(\d{1,3})\b[\s.:–-]*(.*)$", Options);
    private static readonly Regex NumberedHeading = new(@"^(\d{1,3})\s*[.)–-]\s+(.+)$", Options);
    private static readonly Regex AnswerKeyHeading = new(@"^GABARITO\b(?!\s*[:\-–]?\s*\(?[A-E]\)?\s*\.?$)", Options);
    private static readonly Regex AnswerKeyPair = new(@"(?<!\d)(\d{1,3})\s*[-–.:)]?\s*\(?([A-E])\)?(?![A-Za-zÀ-ÿ])", Options);
    // "Tópico: Normalização", "Assunto: SQL", "Conteúdo – Redes" written in the question.
    private static readonly Regex TopicLabel = new(@"^(?:T[ÓO]PICO|ASSUNTO|CONTE[ÚU]DO|TEMA)\s*[:\-–]\s*(.{2,150})$", Options);
    private static readonly Regex InlineAnswer = new(@"^(?:GABARITO|RESPOSTA|ALTERNATIVA CORRETA|RESPOSTA CORRETA)\s*[:\-–]?\s*\(?([A-E])\)?\s*\.?$", Options);

    // Options: "(A) texto", "A) texto", "a. texto", "A – texto"
    private static readonly Regex OptionStrong = new(@"^\(?([A-Ea-e])\s*[).–-]\s*(.*)$", RegexOptions.Compiled);
    // ENADE style: capital letter, spaces, text — or the letter alone on its line.
    private static readonly Regex OptionLoose = new(@"^([A-E])(?:\s+(.+))?$", RegexOptions.Compiled);

    private static readonly Regex Noise = new(@"^(?:ÁREA LIVRE|AREA LIVRE|\*[A-Z0-9]+\*|\d{1,3}|P[áa]gina\s+\d+(?:\s+de\s+\d+)?)$", Options);
    private static readonly Regex PerceptionSurvey = new(@"^QUESTION[ÁA]RIO\s+DE\s+PERCEP[ÇC][ÃA]O(?:\s+DA\s+PROVA)?$", Options);
    private static readonly Regex RomanItem = new(@"^(?:I|II|III|IV|V|VI|VII|VIII)\s*[.)–-]\s", RegexOptions.Compiled);

    public static List<QuestionDraft> Parse(IReadOnlyList<SourceLine> source, DraftDefaults defaults)
    {
        var lines = source
            .Select(l => l with { Text = Regex.Replace(l.Text, @"\s+", " ").Trim() })
            .Where(l => l.Text.Length > 0 && !Noise.IsMatch(l.Text))
            .ToList();

        // 0. ENADE tests end with the "Questionário de Percepção da Prova" (how hard was
        // the test, how long it took…): numbered 1–9 with A–E options, but not questions.
        // The cover also names it (instructions, table of parts): only the title on a line
        // of its own, after the first question, counts. Everything from that page on is
        // dropped (in reading order the title may come after the page's first items).
        var firstQuestion = lines.FindIndex(l => ExamHeading.IsMatch(l.Text));
        if (firstQuestion >= 0)
        {
            var survey = lines.FindIndex(firstQuestion, l => PerceptionSurvey.IsMatch(l.Text));
            if (survey >= 0)
            {
                var surveyPage = lines[survey].Page;
                lines = lines.Where(l => l.Page < surveyPage).ToList();
            }
        }

        // 1. Answer key at the end ("GABARITO" and pairs number → letter).
        var answerKey = new Dictionary<int, string>();
        var keyIndex = lines.FindIndex(l => AnswerKeyHeading.IsMatch(l.Text));
        if (keyIndex >= 0)
        {
            foreach (var line in lines.Skip(keyIndex))
            {
                foreach (Match pair in AnswerKeyPair.Matches(line.Text))
                {
                    answerKey[int.Parse(pair.Groups[1].Value)] = pair.Groups[2].Value.ToLowerInvariant();
                }
            }
            lines = lines.Take(keyIndex).ToList();
        }

        // 2. Where each question starts.
        var heading = lines.Any(l => ExamHeading.IsMatch(l.Text)) ? ExamHeading : NumberedHeading;
        var starts = lines
            .Select((line, index) => (line, index, match: heading.Match(line.Text)))
            .Where(x => x.match.Success)
            .ToList();

        var drafts = new List<QuestionDraft>();
        for (var q = 0; q < starts.Count; q++)
        {
            var (headLine, headIndex, match) = starts[q];
            var end = q + 1 < starts.Count ? starts[q + 1].index : lines.Count;
            var number = int.Parse(match.Groups[1].Value);
            var body = new List<string>();
            var rest = match.Groups[2].Value.Trim();
            if (rest.Length > 0) body.Add(rest);
            body.AddRange(lines.Skip(headIndex + 1).Take(end - headIndex - 1).Select(l => l.Text));
            drafts.Add(BuildDraft(number, headLine.Page, body, answerKey, defaults));
        }
        return drafts;
    }

    private static QuestionDraft BuildDraft(int number, int page, List<string> body, Dictionary<int, string> answerKey, DraftDefaults defaults)
    {
        // An answer written inside the question wins over the answer key; a topic line is taken as the topic.
        string? inlineAnswer = null;
        string? labeledTopic = null;
        body = body.Where(line =>
        {
            var answer = InlineAnswer.Match(line);
            if (answer.Success)
            {
                inlineAnswer = answer.Groups[1].Value.ToLowerInvariant();
                return false;
            }
            var topic = TopicLabel.Match(line);
            if (topic.Success)
            {
                labeledTopic = topic.Groups[1].Value.Trim().TrimEnd('.');
                return false;
            }
            return true;
        }).ToList();

        var markers = FindOptionMarkers(body);
        var draft = new QuestionDraft
        {
            Source = $"PDF, página {page}, questão {number}",
            Code = defaults.Year > 0 ? $"Q{defaults.Year}-{number}" : "",
            AreaSlug = defaults.AreaSlug,
            Topic = labeledTopic ?? defaults.Topic,
            TopicOrigin = labeledTopic is not null ? "do PDF" : defaults.Topic.Length > 0 ? "padrão" : "",
            Year = defaults.Year,
            Difficulty = defaults.Difficulty,
            Correct = inlineAnswer ?? answerKey.GetValueOrDefault(number, ""),
        };

        var statementEnd = markers.Count > 0 ? markers[0].Line : body.Count;
        draft.Statement = JoinParagraphs(body.Take(statementEnd));
        for (var i = 0; i < markers.Count; i++)
        {
            var (line, letter, firstText) = markers[i];
            var next = i + 1 < markers.Count ? markers[i + 1].Line : body.Count;
            var parts = new List<string>();
            if (firstText.Length > 0) parts.Add(firstText);
            parts.AddRange(body.Skip(line + 1).Take(next - line - 1));
            draft.SetOption(letter, string.Join(" ", parts).Trim());
        }
        return draft;
    }

    /// <summary>
    /// The option lines of a question: the LAST sequence A→B→C→D→E in order, so
    /// a statement sentence that starts with the article "A" is not taken for
    /// option A. Falls back to the longest partial sequence.
    /// </summary>
    private static List<(int Line, string Letter, string Text)> FindOptionMarkers(List<string> body)
    {
        var candidates = new List<(int Line, string Letter, string Text)>();
        for (var i = 0; i < body.Count; i++)
        {
            var strong = OptionStrong.Match(body[i]);
            if (strong.Success)
            {
                candidates.Add((i, strong.Groups[1].Value.ToLowerInvariant(), strong.Groups[2].Value.Trim()));
                continue;
            }
            var loose = OptionLoose.Match(body[i]);
            if (loose.Success) candidates.Add((i, loose.Groups[1].Value.ToLowerInvariant(), loose.Groups[2].Value.Trim()));
        }

        List<(int, string, string)> best = [];
        foreach (var start in candidates.Where(c => c.Letter == "a").Reverse())
        {
            var sequence = new List<(int, string, string)> { start };
            var position = start.Line;
            foreach (var letter in QuestionDraft.Letters.Skip(1))
            {
                var next = candidates.FirstOrDefault(c => c.Line > position && c.Letter == letter);
                if (next.Letter is null) break;
                sequence.Add(next);
                position = next.Line;
            }
            if (sequence.Count == 5) return sequence;
            if (sequence.Count > best.Count) best = sequence;
        }
        return best;
    }

    /// <summary>Re-joins lines broken by the PDF layout, keeping real paragraph and list breaks.</summary>
    private static string JoinParagraphs(IEnumerable<string> lines)
    {
        var text = new StringBuilder();
        string? previous = null;
        foreach (var line in lines)
        {
            if (previous is not null)
            {
                var newParagraph = previous.EndsWith(':') || previous.EndsWith('.') || previous.EndsWith('?') || RomanItem.IsMatch(line);
                text.Append(newParagraph ? "\n" : " ");
            }
            text.Append(line);
            previous = line;
        }
        return text.ToString().Trim();
    }
}
