using System.Text.RegularExpressions;

namespace InkflowAdmin.Core.Import;

/// <summary>
/// Same rules as the API's questionSchema (backend/src/modules/admin/admin.routes.ts),
/// checked before sending so the reviewer sees every problem at once — plus
/// the code must not exist yet nor repeat inside the batch.
/// </summary>
public sealed class QuestionDraftValidator(IEnumerable<string> areaSlugs, IEnumerable<string> existingCodes)
{
    private static readonly Regex CodePattern = new(@"^Q\d{4}-\d+$", RegexOptions.Compiled);

    private readonly HashSet<string> _areas = new(areaSlugs, StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<string> _existing = new(existingCodes, StringComparer.OrdinalIgnoreCase);

    public static int MaxYear => DateTime.Now.Year + 1;

    /// <summary>Validates every draft and writes its <see cref="QuestionDraft.Problems"/>.</summary>
    public void ValidateAll(IReadOnlyList<QuestionDraft> drafts)
    {
        var repeated = drafts
            .Where(d => !d.Imported && d.Code.Length > 0)
            .GroupBy(d => d.Code, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var draft in drafts)
        {
            if (draft.Imported) continue;
            draft.Problems = string.Join(" ", Problems(draft, repeated));
        }
    }

    /// <summary>The code now exists (after importing it).</summary>
    public void MarkImported(string code) => _existing.Add(code);

    private IEnumerable<string> Problems(QuestionDraft d, HashSet<string> repeated)
    {
        if (!CodePattern.IsMatch(d.Code)) yield return "Código no formato Q2024-15.";
        else if (_existing.Contains(d.Code)) yield return $"O código {d.Code} já existe no banco.";
        else if (repeated.Contains(d.Code)) yield return $"Código {d.Code} repetido no arquivo.";
        if (!_areas.Contains(d.AreaSlug)) yield return "Escolha a área.";
        if (string.IsNullOrWhiteSpace(d.Topic)) yield return "Informe o tópico.";
        else if (d.Topic.Trim().Length > 150) yield return "Tópico com mais de 150 caracteres.";
        if (d.Year < 2004 || d.Year > MaxYear) yield return $"Ano entre 2004 e {MaxYear}.";
        if (!Labels.Difficulties.Contains(d.Difficulty)) yield return "Dificuldade: fácil, médio ou difícil.";
        if (string.IsNullOrWhiteSpace(d.Statement)) yield return "Enunciado vazio.";
        var missing = QuestionDraft.Letters.Where((_, i) => string.IsNullOrWhiteSpace(d.Options[i])).Select(l => l.ToUpperInvariant()).ToList();
        if (missing.Count > 0) yield return $"Faltam as alternativas {string.Join(", ", missing)}.";
        if (d.Options.Any(o => o.Trim().Length > 1000)) yield return "Alternativa com mais de 1000 caracteres.";
        if (!QuestionDraft.Letters.Contains(d.Correct)) yield return "Marque a alternativa correta.";
    }
}
