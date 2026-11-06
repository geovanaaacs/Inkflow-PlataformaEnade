import { InstitutionalPage } from "./InstitutionalPage";

/** /privacidade — what the Inkflow stores and why (matches what the app really does). */
export function PrivacyPage() {
  return (
    <InstitutionalPage
      title="Política de Privacidade"
      updatedAt="6 de novembro de 2026"
      intro="O Inkflow é um projeto acadêmico de preparação para o ENADE. Esta página explica, de forma direta, quais dados guardamos, para que servem e como você pode pedir a exclusão deles, seguindo os princípios da Lei Geral de Proteção de Dados (LGPD)."
      sections={[
        {
          title: "Dados que coletamos",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Cadastro: nome, e-mail, perfil (aluno ou professor) e, se você informar, curso e telefone.</li>
              <li>Estudo: questões respondidas, acertos, anotações, tentativas de simulados e pedidos de mentoria.</li>
              <li>Plano: o plano escolhido e o histórico de trocas de plano.</li>
            </ul>
          ),
        },
        {
          title: "Para que usamos",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Mostrar o seu desempenho, as questões sugeridas e o ranking.</li>
              <li>Liberar os recursos do seu plano e controlar o limite diário do plano Básico.</li>
              <li>Permitir que professores acompanhem o desempenho da turma e respondam aos pedidos de mentoria.</li>
            </ul>
          ),
        },
        {
          title: "Senha, sessão e pagamento",
          body: (
            <>
              <p>
                A senha é guardada apenas como hash (bcrypt): nem a equipe do Inkflow consegue lê-la. O login fica em um
                cookie protegido (httpOnly), que o JavaScript das páginas não acessa; no aplicativo, em um armazenamento
                seguro do próprio aparelho.
              </p>
              <p>
                O pagamento dos planos é uma simulação: nenhuma cobrança é feita e os dados do cartão digitados no
                formulário não são enviados ao servidor nem guardados.
              </p>
            </>
          ),
        },
        {
          title: "Compartilhamento",
          body: (
            <p>
              Não vendemos nem compartilhamos seus dados com terceiros. No ranking aparecem apenas o seu nome e a sua
              pontuação. Professores veem as respostas dos alunos para acompanhar a turma; as respostas dos professores
              não entram no ranking.
            </p>
          ),
        },
        {
          title: "Seus direitos",
          body: (
            <p>
              Você pode pedir acesso, correção ou exclusão dos seus dados pela página de Contato.
            </p>
          ),
        },
      ]}
    />
  );
}

export default PrivacyPage;
