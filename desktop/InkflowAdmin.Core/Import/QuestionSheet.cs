using System.Globalization;
using System.Text;
using ClosedXML.Excel;

namespace InkflowAdmin.Core.Import;

/// <summary>
/// Spreadsheet of questions (.xlsx or .csv), one question per row. Used to
/// export what came out of a PDF for review outside the app, to import it
/// back, and as the template for typing many questions at once.
///
/// Columns: aprovar | codigo | area | topico | ano | dificuldade | enunciado |
///          a | b | c | d | e | correta | explicacao_ia
/// "area" takes the area slug (e.g. banco-de-dados) or its name.
/// </summary>
public static class QuestionSheet
{
    public static readonly string[] Columns =
        ["aprovar", "codigo", "area", "topico", "ano", "dificuldade", "enunciado", "a", "b", "c", "d", "e", "correta", "explicacao_ia"];

    /// <summary>Writes .xlsx or .csv, chosen by the file extension.</summary>
    public static void Write(string path, IEnumerable<QuestionDraft> drafts)
    {
        var rows = drafts.Select(ToRow).ToList();
        if (IsCsv(path)) WriteCsv(path, rows);
        else WriteXlsx(path, rows);
    }

    /// <summary>Template with the header and one filled example row.</summary>
    public static void WriteTemplate(string path)
    {
        var example = new QuestionDraft
        {
            Approved = true,
            Code = $"Q{DateTime.Now.Year}-1",
            AreaSlug = "banco-de-dados",
            Topic = "Linguagem SQL",
            Year = DateTime.Now.Year,
            Difficulty = "médio",
            Statement = "Qual cláusula SQL filtra grupos depois de uma agregação (GROUP BY)?",
            OptionA = "WHERE",
            OptionB = "HAVING",
            OptionC = "ORDER BY",
            OptionD = "DISTINCT",
            OptionE = "LIMIT",
            Correct = "b",
            Explanation = "HAVING filtra grupos depois da agregação; WHERE filtra linhas antes dela.",
        };
        Write(path, [example]);
    }

    /// <summary>Reads .xlsx or .csv. Area names are turned into slugs with <paramref name="areas"/>.</summary>
    public static List<QuestionDraft> Read(string path, IReadOnlyList<Area> areas)
    {
        var rows = IsCsv(path) ? ReadCsv(path) : ReadXlsx(path);
        if (rows.Count == 0) throw new InvalidDataException("A planilha está vazia.");

        var header = rows[0].Select(Normalize).ToList();
        var missing = Columns.Where(c => c != "aprovar" && c != "explicacao_ia" && !header.Contains(c)).ToList();
        if (missing.Count > 0)
        {
            throw new InvalidDataException($"Faltam colunas na planilha: {string.Join(", ", missing)}. Use o modelo (botão \"Baixar modelo\").");
        }
        string Cell(IReadOnlyList<string> row, string column)
        {
            var index = header.IndexOf(column);
            return index >= 0 && index < row.Count ? row[index].Trim() : "";
        }

        var drafts = new List<QuestionDraft>();
        for (var r = 1; r < rows.Count; r++)
        {
            var row = rows[r];
            if (row.All(string.IsNullOrWhiteSpace)) continue;
            var draft = new QuestionDraft
            {
                Source = $"planilha, linha {r + 1}",
                Approved = IsYes(Cell(row, "aprovar")),
                Code = Cell(row, "codigo"),
                AreaSlug = AreaSlug(Cell(row, "area"), areas),
                Topic = Cell(row, "topico"),
                Year = int.TryParse(Cell(row, "ano"), NumberStyles.Integer, CultureInfo.InvariantCulture, out var year) ? year : 0,
                Difficulty = Difficulty(Cell(row, "dificuldade")),
                Statement = Cell(row, "enunciado"),
                Correct = Cell(row, "correta").Trim('(', ')', '.', ' '),
                Explanation = Cell(row, "explicacao_ia"),
            };
            foreach (var letter in QuestionDraft.Letters) draft.SetOption(letter, Cell(row, letter));
            drafts.Add(draft);
        }
        return drafts;
    }

    private static string[] ToRow(QuestionDraft d) =>
    [
        d.Approved ? "sim" : "não", d.Code, d.AreaSlug, d.Topic, d.Year > 0 ? d.Year.ToString(CultureInfo.InvariantCulture) : "",
        d.Difficulty, d.Statement, d.OptionA, d.OptionB, d.OptionC, d.OptionD, d.OptionE, d.Correct, d.Explanation,
    ];

    private static bool IsCsv(string path) => Path.GetExtension(path).Equals(".csv", StringComparison.OrdinalIgnoreCase);

    private static string Normalize(string header) =>
        header.Trim().ToLowerInvariant()
            .Replace("ó", "o").Replace("ã", "a").Replace("ç", "c").Replace("é", "e").Replace("í", "i")
            .Replace(" ", "_");

    private static bool IsYes(string value) =>
        value.Trim().ToLowerInvariant() is "sim" or "s" or "x" or "1" or "true" or "verdadeiro";

    /// <summary>Accepts the slug or the area name (case and accents as typed).</summary>
    private static string AreaSlug(string value, IReadOnlyList<Area> areas)
    {
        var match = areas.FirstOrDefault(a =>
            a.Slug.Equals(value, StringComparison.OrdinalIgnoreCase)
            || a.Name.Equals(value, StringComparison.CurrentCultureIgnoreCase)
            || a.ShortName.Equals(value, StringComparison.CurrentCultureIgnoreCase));
        return match?.Slug ?? value;
    }

    /// <summary>"Medio", "MÉDIO", "medio" → "médio".</summary>
    private static string Difficulty(string value) =>
        value.Trim().ToLowerInvariant() switch
        {
            "facil" or "fácil" => "fácil",
            "medio" or "médio" => "médio",
            "dificil" or "difícil" => "difícil",
            var other => other,
        };

    /* ------------------------------------------------------------ Excel */

    private static void WriteXlsx(string path, List<string[]> rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("questoes");
        for (var c = 0; c < Columns.Length; c++) sheet.Cell(1, c + 1).Value = Columns[c];
        for (var r = 0; r < rows.Count; r++)
        {
            for (var c = 0; c < Columns.Length; c++) sheet.Cell(r + 2, c + 1).Value = rows[r][c];
        }
        var header = sheet.Range(1, 1, 1, Columns.Length);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#EFE6FB");
        sheet.SheetView.FreezeRows(1);
        sheet.Columns().Width = 18;
        sheet.Column(7).Width = 60; // enunciado
        sheet.Column(14).Width = 50; // explicação
        sheet.Range(2, 1, Math.Max(2, rows.Count + 1), Columns.Length).Style.Alignment.WrapText = true;
        workbook.SaveAs(path);
    }

    private static List<IReadOnlyList<string>> ReadXlsx(string path)
    {
        using var workbook = OpenWorkbook(path);
        var sheet = workbook.Worksheets.First();
        var used = sheet.RangeUsed();
        if (used is null) return [];
        var lastColumn = used.LastColumn().ColumnNumber();
        return sheet.RowsUsed()
            .Select(row => (IReadOnlyList<string>)Enumerable.Range(1, lastColumn).Select(c => row.Cell(c).GetFormattedString()).ToList())
            .ToList();
    }

    private static XLWorkbook OpenWorkbook(string path)
    {
        try
        {
            return new XLWorkbook(path);
        }
        catch (IOException error)
        {
            throw new InvalidDataException("Não foi possível abrir a planilha. Se ela estiver aberta no Excel, feche-a e tente de novo.", error);
        }
    }

    /* ------------------------------------------------------------ CSV */

    /// <summary>Semicolon-separated, UTF-8 with BOM: what Excel in Portuguese opens directly.</summary>
    private static void WriteCsv(string path, List<string[]> rows)
    {
        var text = new StringBuilder();
        text.AppendLine(string.Join(';', Columns));
        foreach (var row in rows) text.AppendLine(string.Join(';', row.Select(Quote)));
        File.WriteAllText(path, text.ToString(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
    }

    private static string Quote(string value) =>
        value.IndexOfAny([';', '"', '\n', '\r', ',']) >= 0 ? "\"" + value.Replace("\"", "\"\"") + "\"" : value;

    /// <summary>RFC 4180 reader (quotes, line breaks inside quotes); detects ";" or "," as separator.</summary>
    private static List<IReadOnlyList<string>> ReadCsv(string path)
    {
        string text;
        try
        {
            text = File.ReadAllText(path, Encoding.UTF8);
        }
        catch (IOException error)
        {
            throw new InvalidDataException("Não foi possível abrir o CSV. Se ele estiver aberto no Excel, feche-o e tente de novo.", error);
        }
        var firstLine = text.Split('\n')[0];
        var separator = firstLine.Count(c => c == ';') >= firstLine.Count(c => c == ',') ? ';' : ',';

        var rows = new List<IReadOnlyList<string>>();
        var row = new List<string>();
        var cell = new StringBuilder();
        var quoted = false;
        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (quoted)
            {
                if (c == '"' && i + 1 < text.Length && text[i + 1] == '"') { cell.Append('"'); i++; }
                else if (c == '"') quoted = false;
                else cell.Append(c);
            }
            else if (c == '"') quoted = true;
            else if (c == separator) { row.Add(cell.ToString()); cell.Clear(); }
            else if (c == '\n')
            {
                row.Add(cell.ToString().TrimEnd('\r'));
                cell.Clear();
                rows.Add(row);
                row = [];
            }
            else cell.Append(c);
        }
        if (cell.Length > 0 || row.Count > 0) { row.Add(cell.ToString()); rows.Add(row); }
        return rows;
    }
}
