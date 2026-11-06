import { ProfileHome } from "../../features/auth/ProfileHome";

export default function StudentHome() {
  return (
    <ProfileHome
      upcoming={[
        "Dashboard com seu desempenho por área",
        "Banco de questões com filtros e anotações",
        "Ranking geral e dos simulados",
        "Simulados com cronômetro (Premium)",
        "Mentoria e grupos de estudo (Premium)",
      ]}
    />
  );
}
