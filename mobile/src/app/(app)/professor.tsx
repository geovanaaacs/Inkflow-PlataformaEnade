import { ProfileHome } from "../../features/auth/ProfileHome";

export default function TeacherHome() {
  return (
    <ProfileHome
      upcoming={[
        "Painel com as respostas dos alunos",
        "Questões com mais erros",
        "Horários de mentoria e pedidos dos alunos",
      ]}
    />
  );
}
