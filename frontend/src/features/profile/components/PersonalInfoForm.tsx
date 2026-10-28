import { useState, type FormEvent } from "react";
import { User } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  course: string;
}

interface PersonalInfoFormProps {
  initialValue: PersonalInfo;
}

export function PersonalInfoForm({ initialValue }: PersonalInfoFormProps) {
  const [form, setForm] = useState(initialValue);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function update<K extends keyof PersonalInfo>(key: K, value: PersonalInfo[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedMessage("Alterações salvas com sucesso.");
    window.setTimeout(() => setSavedMessage(null), 3000);
  }

  return (
    <Card as="section" aria-labelledby="personal-info-heading">
      <h2
        id="personal-info-heading"
        className="flex items-center gap-2 text-lg font-semibold text-ink-strong"
      >
        <User aria-hidden="true" className="size-4 text-brand-800" />
        Informações pessoais
      </h2>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Nome completo"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            required
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Telefone"
            type="tel"
            placeholder="(99) 99999-9999"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
          <Input
            label="Curso"
            value={form.course}
            onChange={(event) => update("course", event.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <Button type="submit">Salvar alterações</Button>
          <p role="status" aria-live="polite" className="text-sm text-success">
            {savedMessage}
          </p>
        </div>
      </form>
    </Card>
  );
}
