import { describe, expect, it } from "vitest";
import { fotoDoSocio, fotoValida, MAX_FOTO } from "./avatar";

describe("avatar", () => {
  it("sem foto usa as iniciais; com foto, endereço versionado", () => {
    expect(fotoDoSocio({ id: "a", fotoEm: null })).toBeNull();
    expect(fotoDoSocio(undefined)).toBeNull();
    expect(fotoDoSocio({ id: "a b", fotoEm: "2026-11-18T10:00:00.000Z" })).toBe(`/api/avatar/a%20b?v=${Date.parse("2026-11-18T10:00:00.000Z")}`);
  });

  it("aceita só imagens pequenas em base64", () => {
    expect(fotoValida("data:image/webp;base64,AAAA")).toBe(true);
    expect(fotoValida("data:image/svg+xml;base64,AAAA")).toBe(false);
    expect(fotoValida("data:image/png;base64,AA<script>")).toBe(false);
    expect(fotoValida(`data:image/png;base64,${"A".repeat(MAX_FOTO)}`)).toBe(false);
    expect(fotoValida(null)).toBe(false);
  });
});
