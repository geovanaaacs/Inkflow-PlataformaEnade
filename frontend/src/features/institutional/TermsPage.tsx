import { InstitutionalPage } from "./InstitutionalPage";

/** /termos — terms of use, consistent with the plans and rules the app enforces. */
export function TermsPage() {
  return (
    <InstitutionalPage
      title="Termos de Uso"
      updatedAt="6 de novembro de 2026"
      intro="Ao criar uma conta no Inkflow você concorda com as regras abaixo. Elas existem para que a plataforma seja justa para todos os estudantes."
      sections={[
        {
          title: "1. O que é o Inkflow",
          body: (
            <p>
              Uma plataforma acadêmica de estudo para o ENADE dos cursos de TI, com banco de questões, simulados
              cronometrados, ranking e mentoria com professores. O conteúdo é educativo e não substitui as orientações
              oficiais do INEP.
            </p>
          ),
        },
        {
          title: "2. Sua conta",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Cada conta é pessoal: não compartilhe sua senha.</li>
              <li>Informe dados verdadeiros no cadastro.</li>
              <li>Contas de professor e de administrador têm permissões próprias e são acompanhadas pela equipe.</li>
            </ul>
          ),
        },
        {
          title: "3. Planos",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Básico (gratuito): limite diário de questões; refazer uma questão já respondida não gasta o limite.</li>
              <li>Avançado: questões ilimitadas, anotações e histórico completo.</li>
              <li>Premium: tudo do Avançado, mais simulados, ranking dos simulados e mentoria.</li>
              <li>
                O pagamento é simulado neste projeto. A troca de plano vale imediatamente e pode ser feita a qualquer
                momento na página de Planos.
              </li>
            </ul>
          ),
        },
        {
          title: "4. Uso justo",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>O ranking considera só a primeira tentativa de cada questão; tentativas seguintes não somam pontos.</li>
              <li>É proibido automatizar respostas, explorar falhas ou tentar acessar dados de outros usuários.</li>
              <li>Mensagens de mentoria devem ser respeitosas. Abusos levam à desativação da conta.</li>
            </ul>
          ),
        },
        {
          title: "5. Conteúdo das questões",
          body: (
            <p>
              As questões, explicações e comentários são preparados para fins de estudo. Se encontrar um erro, avise
              pela página de Contato para que a equipe revise.
            </p>
          ),
        },
      ]}
    />
  );
}

export default TermsPage;
