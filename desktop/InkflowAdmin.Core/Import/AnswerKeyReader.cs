using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace InkflowAdmin.Core.Import;

/// <summary>Answer of one question in an official answer key: a letter (a–e) or annulled.</summary>
public sealed record AnswerKeyEntry(int Number, string? Letter, bool Annulled);

/// <summary>
/// Reads the ENADE answer key PDFs published by INEP (a separate file from the
/// test). They are tables, and their text comes out column by column ("1 2 3 …"
/// then "C D B …"), so the reader pairs cells by position instead: words on the
/// same row of the page, a question number followed, to its right, by a letter,
/// "ANULADA" or "***" (discursive question, no letter). Handles the layouts of
/// 2008–2023: "QUESTÃO 12 | C", "ITEM | GABARITO" and side-by-side tables.
/// </summary>
public static class AnswerKeyReader
{
    private static readonly Regex QuestionNumber = new(@"^\d{1,2}$", RegexOptions.CultureInvariant);
    private static readonly Regex Letter = new(@"^\(?([A-Ea-e])\)?\.?$", RegexOptions.CultureInvariant);

    public static List<AnswerKeyEntry> Read(string path)
    {
        PdfDocument document;
        try
        {
            document = PdfDocument.Open(path);
        }
        catch (Exception error)
        {
            throw new InvalidDataException($"Não foi possível abrir o PDF do gabarito ({error.Message}).", error);
        }

        var entries = new Dictionary<int, AnswerKeyEntry>();
        using (document)
        {
            foreach (var page in document.GetPages())
            {
                foreach (var row in Rows(page.GetWords().ToList()))
                {
                    foreach (var entry in PairsInRow(row)) entries.TryAdd(entry.Number, entry);
                }
            }
        }

        // A real answer key covers almost every number from 1 to the last question. A test
        // PDF opened here by mistake gives a few scattered "answers" (page numbers + words).
        var highest = entries.Count == 0 ? 0 : entries.Keys.Max();
        if (entries.Count < 5 || entries.Count < highest * 0.8)
        {
            throw new InvalidDataException(
                "Este PDF não parece um gabarito. Escolha o arquivo de GABARITO do INEP (não o da prova); ele precisa ter texto selecionável.");
        }
        return entries.Values.OrderBy(e => e.Number).ToList();
    }

    /// <summary>Words grouped by line of the page (similar vertical center), each row left to right.</summary>
    private static IEnumerable<List<Word>> Rows(List<Word> words)
    {
        var rows = new List<(double Center, double Height, List<Word> Words)>();
        foreach (var word in words.OrderByDescending(w => Center(w)))
        {
            var height = Math.Max(word.BoundingBox.Height, 1);
            var index = rows.FindIndex(r => Math.Abs(r.Center - Center(word)) <= Math.Max(r.Height, height) * 0.6);
            if (index >= 0) rows[index].Words.Add(word);
            else rows.Add((Center(word), height, new List<Word> { word }));
        }
        return rows.Select(r => r.Words.OrderBy(w => w.BoundingBox.Left).ToList());
    }

    private static double Center(Word word) => (word.BoundingBox.Bottom + word.BoundingBox.Top) / 2;

    /// <summary>
    /// "QUESTÃO 12 … C", "12 C", "12 C 13 D" (side-by-side tables). A number right
    /// after "DISCURSIVA" is a discursive question and is skipped.
    /// </summary>
    private static IEnumerable<AnswerKeyEntry> PairsInRow(List<Word> row)
    {
        var tokens = row.Select(w => Normalize(w.Text)).ToList();
        for (var i = 0; i < tokens.Count; i++)
        {
            if (!QuestionNumber.IsMatch(tokens[i])) continue;
            if (i > 0 && tokens[i - 1].StartsWith("DISCURSIVA", StringComparison.Ordinal)) continue;
            var number = int.Parse(tokens[i], CultureInfo.InvariantCulture);
            if (number is < 1 or > 80) continue;

            // The answer is the first answer-like token to the right, before the next question number.
            for (var j = i + 1; j < tokens.Count && !QuestionNumber.IsMatch(tokens[j]); j++)
            {
                if (tokens[j].StartsWith("ANULAD", StringComparison.Ordinal))
                {
                    yield return new AnswerKeyEntry(number, null, Annulled: true);
                    break;
                }
                if (tokens[j].Length > 0 && tokens[j].All(c => c == '*')) break; // discursive: no letter
                var letter = Letter.Match(tokens[j]);
                if (letter.Success)
                {
                    yield return new AnswerKeyEntry(number, letter.Groups[1].Value.ToLowerInvariant(), Annulled: false);
                    break;
                }
            }
        }
    }

    /// <summary>Upper case, no accents ("Questão" → "QUESTAO"), no trailing punctuation.</summary>
    private static string Normalize(string text)
    {
        var decomposed = text.Trim().ToUpperInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) builder.Append(c);
        }
        return builder.ToString().TrimEnd(':', ';', ',');
    }
}
