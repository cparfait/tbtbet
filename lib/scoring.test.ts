import { describe, it, expect } from "vitest";
import { computePoints } from "./scoring";
import { resultPoints, outcomeResultPoints, type Odds1x2 } from "./odds";

// Échantillon France–Norvège : favori net à domicile.
//   R(domicile) = 3, R(nul) = 5, R(extérieur) = 5  (cf. assertions plus bas).
const ODDS: Odds1x2 = { home: 1.4, draw: 4.8, away: 7.5 };

const p = (h: number, a: number) => ({ homeScore: h, awayScore: a });

describe("resultPoints (courbe douce 1..6)", () => {
  it("borne entre 1 et 6", () => {
    expect(resultPoints(100)).toBe(1); // certitude → 1
    expect(resultPoints(0)).toBe(6); // quasi impossible → 6
  });
  it("plus l'issue est improbable, plus ça rapporte", () => {
    expect(resultPoints(20)).toBeGreaterThan(resultPoints(70));
  });
});

describe("outcomeResultPoints", () => {
  it("favori < outsider", () => {
    const home = outcomeResultPoints(ODDS, 1); // favori
    const away = outcomeResultPoints(ODDS, -1); // outsider
    expect(home).toBe(3);
    expect(away).toBe(5);
    expect(home! < away!).toBe(true);
  });
  it("renvoie null si une cote manque ou est invalide", () => {
    expect(outcomeResultPoints({ home: 2, draw: 3 }, 1)).toBeNull();
    expect(outcomeResultPoints({ home: 1, draw: 3, away: 4 }, 1)).toBeNull();
    expect(outcomeResultPoints(null, 0)).toBeNull();
  });
});

describe("computePoints — repli (sans cote, barème 3/2/1)", () => {
  it("score exact = 3", () => {
    expect(computePoints(p(2, 1), p(2, 1)).points).toBe(3);
  });
  it("bon vainqueur + bonne différence (hors nul) = 2", () => {
    expect(computePoints(p(3, 1), p(2, 0)).points).toBe(2);
  });
  it("bon vainqueur, mauvaise différence = 1", () => {
    expect(computePoints(p(1, 0), p(3, 0)).points).toBe(1);
  });
  it("bon nul mais mauvais score = 1 (pas de bonus diff sur un nul)", () => {
    expect(computePoints(p(0, 0), p(1, 1)).points).toBe(1);
  });
  it("nul exact = 3", () => {
    expect(computePoints(p(1, 1), p(1, 1)).points).toBe(3);
  });
  it("mauvais pronostic = 0", () => {
    expect(computePoints(p(1, 0), p(0, 2)).points).toBe(0);
  });
  it("joker double (exact = 6)", () => {
    expect(computePoints(p(2, 1), p(2, 1), true).points).toBe(6);
  });
  it("cotes invalides → repli", () => {
    expect(computePoints(p(2, 1), p(2, 1), false, { home: 2, draw: 3 }).points).toBe(3);
  });
});

describe("computePoints — barème aux cotes (R, R+1, R×2)", () => {
  // Résultat : victoire DOMICILE 2-0 → R = 3.
  it("score exact = R×2", () => {
    expect(computePoints(p(2, 0), p(2, 0), false, ODDS).points).toBe(6);
  });
  it("bon vainqueur + bonne diff = R+1", () => {
    expect(computePoints(p(3, 1), p(2, 0), false, ODDS).points).toBe(4);
  });
  it("bon vainqueur, mauvaise diff = R", () => {
    expect(computePoints(p(1, 0), p(2, 0), false, ODDS).points).toBe(3);
  });
  it("mauvais résultat = 0", () => {
    expect(computePoints(p(0, 1), p(2, 0), false, ODDS).points).toBe(0);
  });
  it("joker double (exact favori = 12)", () => {
    expect(computePoints(p(2, 0), p(2, 0), true, ODDS).points).toBe(12);
  });

  // Résultat : victoire EXTÉRIEUR 0-2 → R = 5 (outsider).
  it("exact sur un outsider rapporte plus (R×2 = 10)", () => {
    expect(computePoints(p(0, 2), p(0, 2), false, ODDS).points).toBe(10);
  });
  it("bon vainqueur outsider, bonne diff = R+1 = 6", () => {
    expect(computePoints(p(1, 3), p(0, 2), false, ODDS).points).toBe(6);
  });

  // Résultat : NUL 1-1 → R = 5, et pas de bonus diff sur un nul.
  it("nul exact = R×2 = 10", () => {
    expect(computePoints(p(1, 1), p(1, 1), false, ODDS).points).toBe(10);
  });
  it("bon nul, mauvais score = R = 5 (aucun bonus diff)", () => {
    expect(computePoints(p(2, 2), p(1, 1), false, ODDS).points).toBe(5);
  });
});
