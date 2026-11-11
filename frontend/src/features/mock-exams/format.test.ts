import { describe, expect, it } from "vitest";
import { formatCountdown, formatElapsed } from "./format";

describe("tempo do simulado", () => {
  it("formata o cronômetro regressivo e o tempo gasto", () => {
    expect(formatCountdown(5 * 60_000)).toBe("05:00");
    expect(formatCountdown(3_723_000)).toBe("1:02:03");
    expect(formatCountdown(500)).toBe("00:01"); // arredonda para cima: nunca mostra 00:00 antes do fim
    expect(formatElapsed(45_000)).toBe("45 s");
    expect(formatElapsed(12 * 60_000 + 30_000)).toBe("12 min 30 s");
    expect(formatElapsed(-1_000)).toBe("0 s");
  });
});
