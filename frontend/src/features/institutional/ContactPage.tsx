import { InstitutionalPage } from "./InstitutionalPage";
import { GITHUB_URL } from "./links";

/** /contato — how to reach the team, plus quick answers to common questions. */
export function ContactPage() {
  return (
    <InstitutionalPage
      title="Contato"
      intro="Dúvidas, sugestões ou encontrou um erro em alguma questão? Fale com a equipe do Inkflow por um dos canais abaixo."
      sections={[
        {
          title: "Canais",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>
                E-mail: <span className="font-semibold">contato@inkflow.com</span> — respondemos em até 2 dias úteis.
              </li>
              <li>
                Problemas técnicos e sugestões:{" "}
                <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer" className="font-semibold text-brand-ink underline">
                  abra uma issue no GitHub do projeto
                </a>
                .
              </li>
              <li>Endereço: São José dos Campos - SP.</li>
            </ul>
          ),
        },
        {
          title: "Perguntas frequentes",
          body: (
            <dl className="space-y-3">
              <div>
                <dt className="font-semibold">Como troco de plano?</dt>
                <dd className="text-ink-muted">Na página de Planos, escolha o plano e conclua o pagamento simulado.</dd>
              </div>
              <div>
                <dt className="font-semibold">Respondi errado. Posso tentar de novo?</dt>
                <dd className="text-ink-muted">
                  Sim. A nova tentativa fica no seu histórico, mas não gasta o limite diário nem soma pontos no ranking.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Quando vejo o gabarito comentado?</dt>
                <dd className="text-ink-muted">Depois de responder a questão: os painéis da IA e do professor são liberados.</dd>
              </div>
              <div>
                <dt className="font-semibold">Como peço a exclusão dos meus dados?</dt>
                <dd className="text-ink-muted">Envie um e-mail para o endereço acima a partir do e-mail da sua conta.</dd>
              </div>
            </dl>
          ),
        },
      ]}
    />
  );
}

export default ContactPage;
