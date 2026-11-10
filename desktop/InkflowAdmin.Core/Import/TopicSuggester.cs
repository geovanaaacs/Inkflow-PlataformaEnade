using System.Globalization;
using System.Text;

namespace InkflowAdmin.Core.Import;

/// <summary>A suggested area + topic and why.</summary>
public sealed record TopicSuggestion(string AreaSlug, string Topic, double Score, string BasedOn);

/// <summary>
/// Suggests the area and topic of a new question by comparing its text with
/// the questions already in the bank (TF-IDF + cosine similarity). Runs on the
/// computer, no internet or AI service: the more classified questions the bank
/// has, the better the suggestions. A topic with no similar question gets no
/// suggestion (the reviewer, or the default topic, decides).
/// </summary>
public sealed class TopicSuggester
{
    /// <summary>Similarity to a bank question strong enough to take its area and topic.</summary>
    public const double StrongScore = 0.25;

    /// <summary>Weaker similarity, only used to pick the topic inside an area found by keywords.</summary>
    public const double MinimumScore = 0.12;

    /// <summary>Topic used when the area is clear but no topic of it is similar.</summary>
    public const string GeneralTopic = "Geral";

    /// <summary>Keyword stems per area (accent-free, lower case): they recognize the subject even
    /// when the bank has no similar question yet. A hit needs at least two keyword matches.</summary>
    private static readonly Dictionary<string, string[]> AreaKeywords = new()
    {
        ["banco-de-dados"] = ["sql", "select", "join", "tabela", "chave", "normal", "relacional", "transac", "acid", "consulta", "indice", "banco", "dado", "entidade", "atributo", "commit", "rollback", "where", "group", "nosql"],
        ["redes"] = ["tcp", "udp", "ip", "rede", "protocolo", "roteador", "roteamento", "pacote", "dns", "dhcp", "http", "camada", "osi", "switch", "mascara", "subrede", "endereco", "porta", "ethernet", "wifi"],
        ["sistemas-operacionais"] = ["processo", "thread", "escalonamento", "deadlock", "semaforo", "kernel", "pagina", "paginacao", "memoria", "virtual", "sistema operacional", "mutex", "concorrencia", "round", "robin", "escalonador", "chamada"],
        ["algoritmos"] = ["algoritmo", "complexidade", "ordenacao", "busca", "binaria", "pilha", "fila", "arvore", "grafo", "heap", "vetor", "recursao", "recursiv", "sort", "lista", "hash", "laco", "iteracao"],
        ["engenharia-de-software"] = ["requisito", "scrum", "agil", "uml", "padrao", "projeto", "teste", "classe", "objeto", "heranca", "polimorfismo", "encapsulamento", "interface", "metodo", "excecao", "refatoracao", "kanban", "sprint", "git", "versionamento", "branch", "commit"],
        ["ia"] = ["aprendizado", "modelo", "neural", "perceptron", "treino", "treinamento", "classificacao", "regressao", "overfitting", "supervisionado", "inteligencia", "artificial", "agente", "rotulo", "acuracia"],
        ["seguranca"] = ["criptografia", "chave publica", "assinatura", "hash", "ataque", "vulnerabilidade", "injection", "xss", "senha", "autenticacao", "firewall", "malware", "phishing", "certificado", "confidencialidade", "integridade"],
        ["desenvolvimento-web"] = ["html", "css", "javascript", "api", "rest", "navegador", "front", "backend", "seletor", "json", "dom", "requisicao", "resposta", "get", "post", "patch", "endpoint", "react"],
        ["ciencia-de-dados"] = ["media", "mediana", "moda", "desvio", "estatistica", "grafico", "visualizacao", "amostra", "correlacao", "dataset", "outlier", "distribuicao", "variancia", "histograma"],
        ["arquitetura-de-computadores"] = ["cache", "registrador", "cpu", "processador", "bit", "binario", "complemento", "instrucao", "pipeline", "barramento", "clock", "assembly", "hexadecimal", "localidade", "ula"],
        ["computacao-em-nuvem"] = ["nuvem", "cloud", "iaas", "paas", "saas", "conteiner", "container", "docker", "kubernetes", "virtualizacao", "maquina virtual", "escalabilidade", "serverless", "provedor"],
    };

    // Common Portuguese words and exam boilerplate that say nothing about the subject.
    private static readonly HashSet<string> StopWords =
    [
        "a", "o", "e", "as", "os", "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas", "um", "uma", "uns", "umas",
        "que", "qual", "quais", "para", "por", "pelo", "pela", "pelos", "pelas", "com", "sem", "se", "ao", "aos", "ou", "nao",
        "mais", "menos", "muito", "sobre", "como", "entre", "cada", "esta", "este", "essa", "esse", "isso", "isto", "sua", "seu",
        "suas", "seus", "ser", "sao", "foi", "tem", "ter", "ha", "apenas", "afirma", "afirmacao", "afirmacoes", "afirmativa",
        "afirmativas", "correto", "correta", "corretas", "incorreta", "alternativa", "alternativas", "seguir", "avalie", "assinale",
        "considere", "questao", "caso", "situacao", "exemplo", "deve", "devem", "pode", "podem", "uso", "usar", "utiliza", "partir",
        "acima", "abaixo", "seguinte", "seguintes", "texto", "item", "itens", "todos", "todas", "nenhuma", "nenhum", "mesmo",
        "quando", "onde", "qualquer", "outro", "outra", "outros", "outras", "ela", "ele", "elas", "eles", "nesse", "neste",
        // Roman numerals of "I, II e III, apenas." options: the same in every subject.
        "i", "ii", "iii", "iv", "v", "vi", "vii", "viii",
    ];

    private readonly List<(string AreaSlug, string Topic, string Code, Dictionary<string, double> Vector)> _documents = new();
    private readonly Dictionary<string, double> _idf;
    private readonly double _unknownIdf;

    public TopicSuggester(IEnumerable<Question> bank)
    {
        // One document per question, plus one per topic made of its own name and area
        // (helps topics that still have few questions).
        var raw = new List<(string AreaSlug, string Topic, string Code, List<string> Tokens)>();
        foreach (var q in bank)
        {
            var tokens = Tokenize($"{q.Statement} {string.Join(' ', q.Options.Select(o => o.Label))}");
            tokens.AddRange(Tokenize(q.Topic)); // the topic name counts twice
            tokens.AddRange(Tokenize(q.Topic));
            raw.Add((q.Area.Slug, q.Topic, q.Code, tokens));
        }
        foreach (var topic in bank.GroupBy(q => (q.Area.Slug, q.Topic, q.Area.Name)))
        {
            raw.Add((topic.Key.Slug, topic.Key.Topic, "", Tokenize($"{topic.Key.Topic} {topic.Key.Topic} {topic.Key.Name}")));
        }

        var documentFrequency = new Dictionary<string, int>();
        foreach (var doc in raw)
        {
            foreach (var term in doc.Tokens.Distinct()) documentFrequency[term] = documentFrequency.GetValueOrDefault(term) + 1;
        }
        _idf = documentFrequency.ToDictionary(p => p.Key, p => Math.Log((1.0 + raw.Count) / (1.0 + p.Value)) + 1.0);
        _unknownIdf = Math.Log(1.0 + raw.Count) + 1.0;
        foreach (var doc in raw) _documents.Add((doc.AreaSlug, doc.Topic, doc.Code, Vectorize(doc.Tokens)));
    }

    public bool IsEmpty => _documents.Count == 0;

    /// <summary>
    /// Best area + topic for the text of a question, or null when nothing points to a subject:
    ///   1. a strongly similar bank question → its area and topic;
    ///   2. otherwise the area its keywords point to → the most similar topic of that area, or "Geral".
    /// </summary>
    public TopicSuggestion? Suggest(string statement, IEnumerable<string> options)
    {
        var text = $"{statement} {string.Join(' ', options)}";
        var topics = RankTopics(text);
        var best = topics.FirstOrDefault();
        if (best.Score >= StrongScore) return new TopicSuggestion(best.AreaSlug, best.Topic, best.Score, best.Code);

        var area = AreaByKeywords(text);
        if (area is null) return null;
        var inArea = topics.FirstOrDefault(t => t.AreaSlug == area && t.Score >= MinimumScore);
        return inArea.Topic is not null
            ? new TopicSuggestion(area, inArea.Topic, inArea.Score, inArea.Code)
            : new TopicSuggestion(area, GeneralTopic, 0, "");
    }

    /// <summary>Topics of the bank, most similar first.</summary>
    private List<(string AreaSlug, string Topic, double Score, string Code)> RankTopics(string text)
    {
        if (IsEmpty) return [];
        var query = Vectorize(Tokenize(text));
        if (query.Count == 0) return [];
        return _documents
            .Select(doc => (doc, score: Cosine(query, doc.Vector)))
            .GroupBy(x => (x.doc.AreaSlug, x.doc.Topic))
            .Select(g => (
                g.Key.AreaSlug,
                g.Key.Topic,
                Score: g.Max(x => x.score),
                Code: g.Where(x => x.doc.Code.Length > 0).OrderByDescending(x => x.score).Select(x => x.doc.Code).FirstOrDefault() ?? ""))
            .OrderByDescending(x => x.Score)
            .ToList();
    }

    /// <summary>The area whose keywords appear most (at least two hits), or null.</summary>
    public static string? AreaByKeywords(string text)
    {
        var plain = " " + string.Join(' ', Tokenize(text)) + " ";
        var best = AreaKeywords
            .Select(area => (area.Key, Hits: area.Value.Count(keyword => plain.Contains(" " + keyword))))
            .OrderByDescending(x => x.Hits)
            .ToList();
        // Needs two hits and a clear winner (a tie means the text mixes subjects).
        return best[0].Hits >= 2 && best[0].Hits > best[1].Hits ? best[0].Key : null;
    }

    /// <summary>
    /// Fills area + topic of the drafts with suggestions. Skips imported drafts,
    /// topics written in the PDF and, with <paramref name="onlyMissingTopic"/>,
    /// drafts that already have a topic (e.g. typed in the spreadsheet).
    /// Returns how many drafts got a suggestion.
    /// </summary>
    public int Apply(IEnumerable<QuestionDraft> drafts, bool onlyMissingTopic)
    {
        var applied = 0;
        foreach (var draft in drafts)
        {
            if (draft.Imported || draft.TopicOrigin == "do PDF") continue;
            if (onlyMissingTopic && !string.IsNullOrWhiteSpace(draft.Topic) && !draft.TopicOrigin.StartsWith("sugerido")) continue;
            var suggestion = Suggest(draft.Statement, draft.Options);
            if (suggestion is null) continue;
            draft.AreaSlug = suggestion.AreaSlug;
            draft.Topic = suggestion.Topic;
            draft.TopicOrigin = suggestion.BasedOn.Length > 0
                ? $"sugerido: parecido com {suggestion.BasedOn} ({suggestion.Score:P0})"
                : "sugerido pelas palavras-chave da área";
            applied++;
        }
        return applied;
    }

    /* ------------------------------------------------------------ Text */

    /// <summary>Lower case, no accents, no stop words; plural "s" removed from longer words.</summary>
    public static List<string> Tokenize(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormD);
        var plain = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            plain.Append(char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : ' ');
        }
        return plain.ToString()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 2 && !StopWords.Contains(t) && !t.All(char.IsDigit))
            .Select(t => t.Length > 4 && t.EndsWith('s') ? t[..^1] : t)
            .ToList();
    }

    private Dictionary<string, double> Vectorize(List<string> tokens)
    {
        // Words the bank never used get the highest weight: they can't match anything,
        // but they must count, or a question about a new subject (say, Git) would look
        // similar to whatever shares its two or three common words.
        var vector = new Dictionary<string, double>();
        foreach (var group in tokens.GroupBy(t => t))
        {
            vector[group.Key] = (1 + Math.Log(group.Count())) * _idf.GetValueOrDefault(group.Key, _unknownIdf);
        }
        return vector;
    }

    private static double Cosine(Dictionary<string, double> a, Dictionary<string, double> b)
    {
        double dot = 0;
        foreach (var (term, weight) in a)
        {
            if (b.TryGetValue(term, out var other)) dot += weight * other;
        }
        if (dot == 0) return 0;
        var norm = Math.Sqrt(a.Values.Sum(v => v * v)) * Math.Sqrt(b.Values.Sum(v => v * v));
        return norm == 0 ? 0 : dot / norm;
    }
}
