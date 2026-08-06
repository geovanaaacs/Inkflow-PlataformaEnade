import { Container } from "@/design-system/components/Container";
import { useAuth } from "@/features/auth/auth-context";
import { NotificationsSection } from "./components/NotificationsSection";
import { PersonalInfoForm } from "./components/PersonalInfoForm";
import { ProfileSummaryCard } from "./components/ProfileSummaryCard";
import { SecuritySection } from "./components/SecuritySection";

export function ProfilePage() {
  const { user } = useAuth();

  const name = user?.name || "Maria Clara Silva";
  const course = "Análise e Desenvolvimento de Sistemas";
  const roleLabel =
    user?.role === "professor" ? "Professor(a)" : "Estudante de";

  return (
    <Container as="div" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-strong">Meu perfil</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Gerencie suas informações e preferências
        </p>
      </div>

      <ProfileSummaryCard name={name} description={`${roleLabel} ${course}`} />

      <PersonalInfoForm
        initialValue={{
          name,
          email: user?.email || "maria.clara@email.com",
          phone: "",
          course,
        }}
      />

      <NotificationsSection />

      <SecuritySection />
    </Container>
  );
}

export default ProfilePage;
