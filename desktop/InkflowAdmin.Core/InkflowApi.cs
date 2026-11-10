using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace InkflowAdmin.Core;

/// <summary>Error from the API: its own message ({ "message": "..." }) and the HTTP status (0 = no connection).</summary>
public class ApiException(string message, int status) : Exception(message)
{
    public int Status { get; } = status;
}

/// <summary>
/// Client for the Inkflow API, used by the admin desktop app. Logs in through
/// POST /auth/mobile/login (token instead of the web's cookie) and sends the
/// token as "Authorization: Bearer ..." — same rules as the site and the
/// mobile app, so the API keeps checking the admin profile on every call.
/// </summary>
public sealed class InkflowApi : IDisposable
{
    public const string DefaultBaseUrl = "http://localhost:3333/api";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;

    public InkflowApi(string baseUrl = DefaultBaseUrl)
    {
        BaseUrl = baseUrl.TrimEnd('/');
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public string BaseUrl { get; }

    /// <summary>The logged-in admin (null before LoginAsync).</summary>
    public AuthUser? CurrentUser { get; private set; }

    /* ------------------------------------------------------------ Session */

    /// <summary>Logs in and keeps the token. Only the "admin" profile may use this app.</summary>
    public async Task<AuthUser> LoginAsync(string email, string password)
    {
        var session = await SendAsync<TokenResponse>(HttpMethod.Post, "/auth/mobile/login", new { email = email.Trim(), password });
        if (session.User.Role != "admin")
        {
            throw new ApiException("Apenas administradores podem usar o Inkflow Admin.", 403);
        }
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.Token);
        CurrentUser = session.User;
        return session.User;
    }

    /// <summary>The token is stateless: logging out is forgetting it.</summary>
    public void Logout()
    {
        _http.DefaultRequestHeaders.Authorization = null;
        CurrentUser = null;
    }

    /* ------------------------------------------------------------ Admin */

    public Task<AdminMetrics> GetMetricsAsync() => SendAsync<AdminMetrics>(HttpMethod.Get, "/admin/metrics");

    public Task<List<AdminPayment>> GetPaymentsAsync(int limit = 200) =>
        SendAsync<List<AdminPayment>>(HttpMethod.Get, $"/admin/payments?limit={limit}");

    public Task<List<AdminUser>> GetUsersAsync(string? search = null, string? role = null) =>
        SendAsync<List<AdminUser>>(HttpMethod.Get, "/admin/users" + Query(("search", search), ("role", role)));

    /// <summary>Changes profile, plan or access. Students always have a plan; staff never do.</summary>
    public Task<AdminUser> UpdateUserAsync(string userId, AdminUserChanges changes)
    {
        // Send only what changes (the API rejects an empty body).
        var body = new JsonObject();
        if (changes.Role is not null) body["role"] = changes.Role;
        if (changes.Plan is not null) body["plan"] = changes.Plan;
        if (changes.Active is not null) body["active"] = changes.Active;
        return SendAsync<AdminUser>(HttpMethod.Patch, $"/admin/users/{Uri.EscapeDataString(userId)}", body);
    }

    public Task<List<Question>> GetQuestionsAsync(string? search = null, string? areaSlug = null) =>
        SendAsync<List<Question>>(HttpMethod.Get, "/admin/questions" + Query(("search", search), ("areaSlug", areaSlug)));

    public Task<QuestionCatalog> GetQuestionCatalogAsync() => SendAsync<QuestionCatalog>(HttpMethod.Get, "/admin/questions/catalog");

    public Task<Question> CreateQuestionAsync(QuestionInput input) =>
        SendAsync<Question>(HttpMethod.Post, "/admin/questions", input);

    public Task<Question> UpdateQuestionAsync(string questionId, QuestionInput input) =>
        SendAsync<Question>(HttpMethod.Put, $"/admin/questions/{Uri.EscapeDataString(questionId)}", input);

    /// <summary>Deactivates the question and removes it from the mock exams (answers stay in the history).</summary>
    public Task DeleteQuestionAsync(string questionId) =>
        SendAsync<JsonNode?>(HttpMethod.Delete, $"/admin/questions/{Uri.EscapeDataString(questionId)}");

    /* ------------------------------------------------------------ HTTP */

    private static string Query(params (string Key, string? Value)[] parameters)
    {
        var parts = parameters
            .Where(p => !string.IsNullOrWhiteSpace(p.Value))
            .Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value!.Trim())}")
            .ToList();
        return parts.Count == 0 ? "" : "?" + string.Join("&", parts);
    }

    private async Task<T> SendAsync<T>(HttpMethod method, string path, object? body = null)
    {
        using var request = new HttpRequestMessage(method, BaseUrl + path);
        if (body is not null) request.Content = JsonContent.Create(body, body.GetType(), options: Json);

        HttpResponseMessage response;
        try
        {
            response = await _http.SendAsync(request);
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException)
        {
            throw new ApiException($"Não foi possível conectar à API em {BaseUrl}. Confira se o backend está rodando (npm run dev).", 0);
        }

        using (response)
        {
            var text = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == HttpStatusCode.Unauthorized && CurrentUser is not null)
                {
                    throw new ApiException("Sua sessão expirou. Entre novamente.", 401);
                }
                throw new ApiException(ReadMessage(text) ?? $"A API respondeu com erro {(int)response.StatusCode}.", (int)response.StatusCode);
            }
            if (string.IsNullOrWhiteSpace(text)) return default!; // 204 No Content
            return JsonSerializer.Deserialize<T>(text, Json)!;
        }
    }

    private static string? ReadMessage(string text)
    {
        try
        {
            return JsonNode.Parse(text)?["message"]?.GetValue<string>();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public void Dispose() => _http.Dispose();
}
