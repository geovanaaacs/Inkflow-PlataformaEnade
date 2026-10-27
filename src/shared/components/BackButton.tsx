import { ArrowLeft } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { readReturnTo } from "@/shared/navigation/return-to";

interface BackButtonProps {
  /** Where to go when the page was opened without a "from" (e.g. typed URL). */
  fallback: string;
  label?: string;
}

/** "← Voltar" to the page that linked here (router state), or to `fallback`. */
export function BackButton({ fallback, label = "Voltar" }: BackButtonProps) {
  const location = useLocation();

  return (
    <Button
      to={readReturnTo(location.state) ?? fallback}
      variant="ghost"
      size="sm"
      className="w-fit"
      leadingIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
    >
      {label}
    </Button>
  );
}
