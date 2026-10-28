import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Select } from "@/design-system/components/Select";
import type { Area } from "@/features/questions/data";
import { formatDateTime } from "@/shared/utils/dates";
import type { ResultFilter, StudentAnswerRow } from "../api";

const ALL = "todos";
const PAGE_SIZE = 15;

interface StudentAnswersTableProps {
  rows: StudentAnswerRow[];
  students: { id: string; name: string }[];
  areas: Area[];
}

/** Every answer given by students, newest first, with area/student/result filters. */
export function StudentAnswersTable({ rows, students, areas }: StudentAnswersTableProps) {
  const [area, setArea] = useState(ALL);
  const [student, setStudent] = useState(ALL);
  const [result, setResult] = useState<ResultFilter>("todos");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (area === ALL || row.area.slug === area) &&
          (student === ALL || row.studentId === student) &&
          (result === "todos" || (result === "acertos" ? row.correct : !row.correct))
      ),
    [rows, area, student, result]
  );

  function resetPaging<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setVisible(PAGE_SIZE);
    };
  }

  return (
    <Card as="section" aria-labelledby="student-answers-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="student-answers-heading" className="text-lg font-semibold text-ink-strong">
            Questões respondidas pelos alunos
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {filtered.length} {filtered.length === 1 ? "resposta" : "respostas"} encontradas
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select
            label="Área"
            className="w-48"
            value={area}
            onChange={(event) => resetPaging(setArea)(event.target.value)}
            options={[
              { value: ALL, label: "Todas as áreas" },
              ...areas.map((item) => ({ value: item.slug, label: item.name })),
            ]}
          />
          <Select
            label="Aluno"
            className="w-44"
            value={student}
            onChange={(event) => resetPaging(setStudent)(event.target.value)}
            options={[
              { value: ALL, label: "Todos os alunos" },
              ...students.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <Select
            label="Resultado"
            className="w-36"
            value={result}
            onChange={(event) => resetPaging(setResult)(event.target.value as ResultFilter)}
            options={[
              { value: "todos", label: "Todos" },
              { value: "acertos", label: "Acertos" },
              { value: "erros", label: "Erros" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">Nenhuma resposta para os filtros selecionados.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <caption className="sr-only">Respostas dos alunos, das mais recentes às mais antigas</caption>
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase text-ink-muted">
                <th scope="col" className="py-2 pr-4 font-semibold">Aluno</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Questão</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Resposta</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Resultado</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Origem</th>
                <th scope="col" className="py-2 font-semibold">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="py-3 pr-4 font-medium text-ink-strong">{row.studentName}</td>
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-brand-800">{row.questionCode}</span>
                    <span className="block text-xs text-ink-muted">
                      {row.area.shortName} · {row.topic}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-ink-strong">
                    {row.selectedOptionId.toUpperCase()}
                    <span className="text-ink-muted"> (gabarito {row.correctOptionId.toUpperCase()})</span>
                  </td>
                  <td className="py-3 pr-4">
                    {row.correct ? (
                      <span className="flex items-center gap-1.5 font-semibold text-success">
                        <CheckCircle2 aria-hidden="true" className="size-4" /> Acertou
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-semibold text-danger">
                        <XCircle aria-hidden="true" className="size-4" /> Errou
                      </span>
                    )}
                    {row.attemptNumber > 1 && (
                      <span className="text-xs text-ink-muted">{row.attemptNumber}ª tentativa</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge tone={row.fromMockExam ? "brand" : "neutral"}>
                      {row.fromMockExam ? "Simulado" : "Prática"}
                    </Badge>
                  </td>
                  <td className="py-3 text-ink-muted">{formatDateTime(row.answeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > visible && (
        <Button
          variant="outline"
          fullWidth
          className="mt-4"
          onClick={() => setVisible((current) => current + PAGE_SIZE)}
        >
          Mostrar mais ({filtered.length - visible} restantes)
        </Button>
      )}
    </Card>
  );
}
