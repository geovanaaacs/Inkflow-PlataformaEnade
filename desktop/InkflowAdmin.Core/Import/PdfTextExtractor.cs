using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.PageSegmenter;
using UglyToad.PdfPig.DocumentLayoutAnalysis.ReadingOrderDetector;
using UglyToad.PdfPig.DocumentLayoutAnalysis.WordExtractor;

namespace InkflowAdmin.Core.Import;

/// <summary>
/// Reads the text of a PDF line by line, in reading order. Uses layout analysis
/// (PdfPig's Docstrum) so two-column tests like the ENADE come out one column
/// after the other instead of mixed line by line.
/// </summary>
public static class PdfTextExtractor
{
    public static List<SourceLine> ReadLines(string path)
    {
        PdfDocument document;
        try
        {
            document = PdfDocument.Open(path);
        }
        catch (Exception error)
        {
            throw new InvalidDataException($"Não foi possível abrir o PDF ({error.Message}). Ele pode estar protegido por senha ou corrompido.", error);
        }

        using (document)
        {
            var lines = new List<SourceLine>();
            foreach (var page in document.GetPages())
            {
                var words = page.GetWords(NearestNeighbourWordExtractor.Instance).ToList();
                if (words.Count == 0) continue;
                var blocks = DocstrumBoundingBoxes.Instance.GetBlocks(words);
                foreach (var block in UnsupervisedReadingOrderDetector.Instance.Get(blocks))
                {
                    foreach (var line in block.TextLines)
                    {
                        lines.Add(new SourceLine(page.Number, line.Text));
                    }
                }
            }
            if (lines.Count == 0)
            {
                throw new InvalidDataException(
                    "O PDF não tem texto selecionável (provavelmente é uma imagem escaneada). Use um PDF com texto ou passe as questões para a planilha modelo.");
            }
            return lines;
        }
    }
}
