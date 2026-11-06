import { ProfileHome } from "../../features/auth/ProfileHome";

export default function AdminHome() {
  return (
    <ProfileHome
      upcoming={["Gestão de usuários, perfis e planos", "Cadastro de questões", "Cadastro de simulados"]}
    />
  );
}
