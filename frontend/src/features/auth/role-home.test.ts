import { describe, expect, it } from "vitest";
import { homePathFor } from "./role-home";

describe("rota inicial por perfil", () => {
  it("leva cada perfil para a sua área depois do login", () => {
    expect(homePathFor("aluno")).toBe("/dashboard");
    expect(homePathFor("professor")).toBe("/professor");
    expect(homePathFor("admin")).toBe("/admin/usuarios");
  });
});
