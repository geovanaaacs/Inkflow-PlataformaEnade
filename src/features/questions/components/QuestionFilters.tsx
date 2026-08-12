import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Select, type SelectOption } from "@/design-system/components/Select";

export const ALL_VALUE = "todas";

export interface QuestionFiltersValue {
  keyword: string;
  area: string;
  year: string;
  type: string;
}

interface QuestionFiltersProps {
  draftKeyword: string;
  onDraftKeywordChange: (value: string) => void;
  value: QuestionFiltersValue;
  onChange: (value: QuestionFiltersValue) => void;
  onSubmit: () => void;
  onClear: () => void;
  areaOptions: SelectOption[];
  yearOptions: SelectOption[];
  typeOptions: SelectOption[];
}

export function QuestionFilters({
  draftKeyword,
  onDraftKeywordChange,
  value,
  onChange,
  onSubmit,
  onClear,
  areaOptions,
  yearOptions,
  typeOptions,
}: QuestionFiltersProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Card as="section" aria-label="Filtrar questões" bare className="p-5 shadow-card">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[220px] flex-1">
          <label htmlFor="keyword" className="sr-only">
            Buscar por palavra-chave
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              id="keyword"
              type="search"
              placeholder="Buscar por palavra-chave"
              value={draftKeyword}
              onChange={(event) => onDraftKeywordChange(event.target.value)}
              className="h-8 w-full rounded-dropdown bg-app-surface pl-9 pr-3 text-sm text-ink-strong shadow-input placeholder:text-ink-muted"
            />
          </div>
        </div>

        <Select
          label="Sua área de TI"
          labelHidden
          value={value.area}
          onChange={(event) => onChange({ ...value, area: event.target.value })}
          options={areaOptions}
          className="w-44"
        />
        <Select
          label="Ano"
          labelHidden
          value={value.year}
          onChange={(event) => onChange({ ...value, year: event.target.value })}
          options={yearOptions}
          className="w-28"
        />
        <Select
          label="Tipo"
          labelHidden
          value={value.type}
          onChange={(event) => onChange({ ...value, type: event.target.value })}
          options={typeOptions}
          className="w-40"
        />

        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          Limpar filtros
        </Button>
        <Button
          type="submit"
          size="sm"
          leadingIcon={<Search aria-hidden="true" className="size-4" />}
        >
          Buscar questões
        </Button>
      </form>
    </Card>
  );
}
