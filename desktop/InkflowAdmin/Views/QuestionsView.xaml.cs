using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InkflowAdmin.Core;

namespace InkflowAdmin.Views;

/// <summary>Question bank: list, create, edit and remove (/api/admin/questions).</summary>
public partial class QuestionsView : UserControl, IAdminPage
{
    private readonly InkflowApi _api;
    private QuestionCatalog? _catalog;

    public QuestionsView(InkflowApi api)
    {
        InitializeComponent();
        _api = api;
    }

    public string Title => "Questões";
    public string Subtitle => "Banco de questões usado no site, no app e nos simulados.";

    private Question? Selected => QuestionsGrid.SelectedItem as Question;

    public async Task RefreshAsync()
    {
        Status.Text = "Carregando…";
        try
        {
            // The catalog (areas + topics) feeds the filter and the editor.
            if (_catalog is null)
            {
                _catalog = await _api.GetQuestionCatalogAsync();
                AreaFilter.ItemsSource = new[] { new Option(null, "Todas as áreas") }
                    .Concat(_catalog.Areas.Select(a => new Option(a.Slug, a.Name)))
                    .ToList();
                AreaFilter.SelectedIndex = 0;
            }
            var area = (AreaFilter.SelectedItem as Option)?.Value;
            var questions = await _api.GetQuestionsAsync(SearchBox.Text, area);
            QuestionsGrid.ItemsSource = questions;
            Status.Text = $"{questions.Count} {(questions.Count == 1 ? "questão ativa" : "questões ativas")}. Dê dois cliques numa linha para editar.";
        }
        catch (ApiException error)
        {
            Status.Text = error.Message;
        }
    }

    private async void OnSearch(object sender, RoutedEventArgs e) => await RefreshAsync();

    private async void OnSearchKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter) await RefreshAsync();
    }

    private async void OnFilterChanged(object sender, SelectionChangedEventArgs e)
    {
        if (IsLoaded && _catalog is not null) await RefreshAsync();
    }

    private void OnSelect(object sender, SelectionChangedEventArgs e)
    {
        EditButton.IsEnabled = RemoveButton.IsEnabled = Selected is not null;
    }

    private async void OnNew(object sender, RoutedEventArgs e) => await OpenEditor(null);

    private async void OnEdit(object sender, RoutedEventArgs e)
    {
        if (Selected is not null) await OpenEditor(Selected);
    }

    private async void OnRowDoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (Selected is not null) await OpenEditor(Selected);
    }

    private async Task OpenEditor(Question? question)
    {
        if (_catalog is null) return;
        var editor = new QuestionEditorWindow(_api, _catalog, question) { Owner = Window.GetWindow(this) };
        if (editor.ShowDialog() == true)
        {
            _catalog = null; // new topics may have been created
            await RefreshAsync();
            Status.Text = $"Questão {editor.Saved?.Code} {(question is null ? "criada" : "atualizada")}.";
        }
    }

    private async void OnImport(object sender, RoutedEventArgs e)
    {
        try
        {
            var catalog = await _api.GetQuestionCatalogAsync();
            var bank = await _api.GetQuestionsAsync();
            var window = new ImportQuestionsWindow(_api, catalog, bank) { Owner = Window.GetWindow(this) };
            window.ShowDialog();
            if (window.ImportedCount > 0)
            {
                _catalog = null; // new topics may have been created
                await RefreshAsync();
                Status.Text = $"{window.ImportedCount} {(window.ImportedCount == 1 ? "questão importada" : "questões importadas")}.";
            }
        }
        catch (ApiException error)
        {
            MessageBox.Show(error.Message, "Não foi possível abrir a importação", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async void OnRemove(object sender, RoutedEventArgs e)
    {
        if (Selected is not { } question) return;
        var answer = MessageBox.Show(
            $"Remover a questão {question.Code}?\n\nEla sai do banco de questões e dos simulados em que aparece. As respostas já dadas continuam no histórico dos alunos.",
            "Remover questão", MessageBoxButton.YesNo, MessageBoxImage.Warning);
        if (answer != MessageBoxResult.Yes) return;
        try
        {
            await _api.DeleteQuestionAsync(question.Id);
            await RefreshAsync();
            Status.Text = $"Questão {question.Code} removida.";
        }
        catch (ApiException error)
        {
            MessageBox.Show(error.Message, "Não foi possível remover", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
}
