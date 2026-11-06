import { AccountScreen } from "../../../../features/auth/AccountScreen";

export default function TeacherAccountScreen() {
  return (
    <AccountScreen
      roleLabel="Professor"
      note="Suas respostas nas questões são gravadas, mas não entram no ranking nem nas estatísticas dos alunos."
    />
  );
}
