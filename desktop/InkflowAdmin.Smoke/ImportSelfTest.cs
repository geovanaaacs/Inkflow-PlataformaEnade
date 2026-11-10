using InkflowAdmin.Core;
using InkflowAdmin.Core.Import;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Writer;

/// <summary>
/// Offline test of the question import (no API needed):
///   dotnet run --project InkflowAdmin.Smoke -- importacao [pasta de saída]
/// Builds a two-column sample test PDF, reads it back with the importer and
/// checks every question, then round-trips the drafts through .xlsx and .csv.
/// The files it writes double as examples for trying the import screen.
/// </summary>
internal static class ImportSelfTest
{
    private sealed record SampleQuestion(int Number, string Statement, string[] Options, string Style, string Correct, bool InlineAnswer);

    // Original questions written for this test (not taken from any exam).
    private static readonly SampleQuestion[] Samples =
    [
        new(1,
            "A tabela Matricula(aluno, disciplina, professor) registra que cada disciplina tem um único professor. A dependência disciplina -> professor faz a tabela violar qual forma normal?",
            ["Primeira forma normal.", "Segunda forma normal.", "Terceira forma normal.", "Quarta forma normal.", "Nenhuma: a tabela está normalizada."],
            "enade", "b", false),
        new(2,
            "Sobre o protocolo HTTP, avalie as afirmações a seguir.\nI. O método GET não deve alterar o estado do servidor.\nII. O código 201 indica que um recurso foi criado.\nIII. O código 500 indica erro do cliente.\nÉ correto o que se afirma em:",
            ["I, apenas.", "III, apenas.", "I e II, apenas.", "II e III, apenas.", "I, II e III."],
            "parenteses", "c", false),
        new(3,
            "Em uma fila de prioridade implementada com heap binário mínimo, qual é a complexidade de remover o menor elemento?",
            ["O(1)", "O(n)", "O(n log n)", "O(log n)", "O(n²)"],
            "fecha", "d", true),
        new(4,
            "Qual comando do Git cria uma nova branch e já muda para ela?",
            ["git checkout -b nova", "git branch -d nova", "git merge nova", "git push nova", "git reset nova"],
            "minuscula", "a", false),
    ];

    public static int Run(string outDir)
    {
        Directory.CreateDirectory(outDir);
        var failures = 0;
        void Check(bool ok, string name, string detail = "")
        {
            if (!ok) failures++;
            Console.WriteLine($"{(ok ? "ok   " : "FALHA")} {name}{(detail.Length > 0 ? ": " + detail : "")}");
        }

        var pdf = Path.Combine(outDir, "questoes-exemplo.pdf");
        File.WriteAllBytes(pdf, BuildPdf());
        Console.WriteLine($"PDF de exemplo: {pdf}");

        var lines = PdfTextExtractor.ReadLines(pdf);
        var drafts = QuestionTextParser.Parse(lines, new DraftDefaults("banco-de-dados", "Importação de teste", 2025, "médio"));
        Check(drafts.Count == Samples.Length, "quantidade de questões", $"{drafts.Count} de {Samples.Length}");

        foreach (var sample in Samples)
        {
            var draft = drafts.FirstOrDefault(d => d.Code == $"Q2025-{sample.Number}");
            if (draft is null)
            {
                Check(false, $"questão {sample.Number}", "não encontrada");
                continue;
            }
            var statementOk = Flat(draft.Statement) == Flat(sample.Statement);
            Check(statementOk, $"questão {sample.Number} — enunciado ({sample.Style})", statementOk ? "" : $"\n      lido:     {Flat(draft.Statement)}\n      esperado: {Flat(sample.Statement)}");
            for (var i = 0; i < 5; i++)
            {
                var ok = Flat(draft.Options[i]) == Flat(sample.Options[i]);
                if (!ok) Check(false, $"questão {sample.Number} — alternativa {QuestionDraft.Letters[i].ToUpper()}", $"lida \"{draft.Options[i]}\", esperada \"{sample.Options[i]}\"");
            }
            Check(draft.Options.Select(Flat).SequenceEqual(sample.Options.Select(Flat)), $"questão {sample.Number} — 5 alternativas");
            Check(draft.Correct == sample.Correct, $"questão {sample.Number} — gabarito {(sample.InlineAnswer ? "na própria questão" : "da seção GABARITO")}", $"{draft.Correct.ToUpper()} (esperado {sample.Correct.ToUpper()})");
        }

        // Paragraph breaks of the I/II/III items survive.
        var q2 = drafts.FirstOrDefault(d => d.Code == "Q2025-2");
        Check(q2 is not null && q2.Statement.Contains("\nII. O código 201"), "questão 2 — itens I/II/III em linhas próprias");

        // Validation: everything is filled, so the only problems are codes that "already exist".
        var areas = new List<Area> { new("banco-de-dados", "Banco de Dados", "Banco de Dados"), new("redes", "Redes de Computadores", "Redes") };
        var validator = new QuestionDraftValidator(areas.Select(a => a.Slug), ["Q2025-4"]);
        validator.ValidateAll(drafts);
        Check(drafts.Count(d => d.IsValid) == 3, "validação", string.Join(" | ", drafts.Select(d => $"{d.Code}: {(d.IsValid ? "ok" : d.Problems)}")));

        // Spreadsheet round trip (.xlsx and .csv).
        foreach (var extension in new[] { "xlsx", "csv" })
        {
            var sheet = Path.Combine(outDir, $"questoes-extraidas.{extension}");
            drafts[0].Approved = true;
            QuestionSheet.Write(sheet, drafts);
            var back = QuestionSheet.Read(sheet, areas);
            var same = back.Count == drafts.Count && back.Zip(drafts).All(p =>
                p.First.Code == p.Second.Code && p.First.Statement == p.Second.Statement && p.First.AreaSlug == p.Second.AreaSlug
                && p.First.Year == p.Second.Year && p.First.Correct == p.Second.Correct && p.First.Options.SequenceEqual(p.Second.Options)
                && p.First.Approved == p.Second.Approved);
            Check(same, $"planilha .{extension} — exporta e importa sem perder nada");
        }

        // Template + area typed by name.
        var template = Path.Combine(outDir, "modelo-questoes.xlsx");
        QuestionSheet.WriteTemplate(template);
        var fromTemplate = QuestionSheet.Read(template, areas);
        Check(fromTemplate.Count == 1 && fromTemplate[0].AreaSlug == "banco-de-dados" && fromTemplate[0].Correct == "b", "modelo de planilha");

        Console.WriteLine(failures == 0 ? "\nImportação: tudo certo." : $"\nImportação: {failures} verificação(ões) falharam.");
        return failures == 0 ? 0 : 1;
    }

    private static string Flat(string text) => string.Join(" ", text.Split((char[])[' ', '\n', '\r', '\t'], StringSplitOptions.RemoveEmptyEntries));

    /* ------------------------------------------------------------ Sample PDF */

    private const double PageWidth = 595, PageHeight = 842, Margin = 40, Gutter = 24, FontSize = 10, Leading = 13;
    private static readonly double ColumnWidth = (PageWidth - 2 * Margin - Gutter) / 2;

    private static byte[] BuildPdf()
    {
        // Embedded TrueType fonts (like real exam PDFs): the standard PDF fonts have no Portuguese accents.
        var fonts = Environment.GetFolderPath(Environment.SpecialFolder.Fonts);
        var builder = new PdfDocumentBuilder();
        var regular = builder.AddTrueTypeFont(File.ReadAllBytes(Path.Combine(fonts, "arial.ttf")));
        var bold = builder.AddTrueTypeFont(File.ReadAllBytes(Path.Combine(fonts, "arialbd.ttf")));

        // Page 1: questions 1–2 on the left column, 3–4 on the right (like the ENADE booklet).
        var page = builder.AddPage(PageSize.A4);
        page.AddText("ENADE — SIMULADO DE TESTE DO IMPORTADOR", 12, new PdfPoint(Margin, PageHeight - Margin), bold);
        var columns = new[] { Samples[..2], Samples[2..] };
        for (var column = 0; column < 2; column++)
        {
            var x = Margin + column * (ColumnWidth + Gutter);
            var y = PageHeight - Margin - 30;
            foreach (var q in columns[column])
            {
                y = Write(page, $"QUESTÃO {q.Number:00}", x, y, bold) - 4;
                foreach (var paragraph in q.Statement.Split('\n')) y = Write(page, paragraph, x, y, regular);
                y -= 4;
                for (var i = 0; i < 5; i++)
                {
                    var letter = (char)('A' + i);
                    var prefix = q.Style switch
                    {
                        "enade" => $"{letter}   ",
                        "parenteses" => $"({letter}) ",
                        "fecha" => $"{letter}) ",
                        _ => $"{char.ToLowerInvariant(letter)}. ",
                    };
                    y = Write(page, prefix + q.Options[i], x, y, regular);
                }
                if (q.InlineAnswer) y = Write(page, $"Gabarito: {q.Correct.ToUpperInvariant()}", x, y, bold);
                y = Write(page, "ÁREA LIVRE", x, y - 6, regular) - 14;
            }
        }
        page.AddText("1", 9, new PdfPoint(PageWidth / 2, 20), regular);

        // Page 2: answer key for the questions without an inline answer.
        var keyPage = builder.AddPage(PageSize.A4);
        var keyY = Write(keyPage, "GABARITO", Margin, PageHeight - Margin, bold);
        Write(keyPage, string.Join("    ", Samples.Where(q => !q.InlineAnswer).Select(q => $"{q.Number} - {q.Correct.ToUpperInvariant()}")), Margin, keyY, regular);
        return builder.Build();
    }

    /// <summary>Writes a paragraph wrapped to the column width; returns the next baseline.</summary>
    private static double Write(PdfPageBuilder page, string text, double x, double y, PdfDocumentBuilder.AddedFont font)
    {
        var line = "";
        foreach (var word in text.Split(' '))
        {
            var candidate = line.Length == 0 ? word : line + " " + word;
            if (Width(page, candidate, font) > ColumnWidth && line.Length > 0)
            {
                page.AddText(line, FontSize, new PdfPoint(x, y), font);
                y -= Leading;
                line = word;
            }
            else line = candidate;
        }
        if (line.Length > 0)
        {
            page.AddText(line, FontSize, new PdfPoint(x, y), font);
            y -= Leading;
        }
        return y;
    }

    private static double Width(PdfPageBuilder page, string text, PdfDocumentBuilder.AddedFont font)
    {
        var letters = page.MeasureText(text, FontSize, new PdfPoint(0, 0), font);
        return letters.Count == 0 ? 0 : letters[^1].EndBaseLine.X - letters[0].StartBaseLine.X;
    }
}
