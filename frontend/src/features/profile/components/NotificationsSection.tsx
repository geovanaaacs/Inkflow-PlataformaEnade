import { useState } from "react";
import { Bell } from "lucide-react";
import { Card } from "@/design-system/components/Card";
import { Switch } from "@/design-system/components/Switch";

export function NotificationsSection() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  return (
    <Card as="section" aria-labelledby="notifications-heading">
      <h2
        id="notifications-heading"
        className="flex items-center gap-2 text-lg font-semibold text-ink-strong"
      >
        <Bell aria-hidden="true" className="size-4 text-brand-800" />
        Notificações
      </h2>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-strong">Notificações por e-mail</p>
            <p className="mt-1 text-sm text-ink-muted">
              Receba atualizações sobre novas questões e rankings
            </p>
          </div>
          <Switch
            checked={emailNotifications}
            onChange={setEmailNotifications}
            label="Notificações por e-mail"
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-strong">Notificações push</p>
            <p className="mt-1 text-sm text-ink-muted">
              Receba atualizações sobre novas questões e rankings
            </p>
          </div>
          <Switch
            checked={pushNotifications}
            onChange={setPushNotifications}
            label="Notificações push"
          />
        </div>
      </div>
    </Card>
  );
}
