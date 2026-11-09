import { expect, test } from "vitest";
import { DATA, MEMBERS } from "../data/dataset";

test("each participation points to a known project and organisation, with a known role", () => {
  const orgs = new Set(DATA.organisations.map((o) => o.id)), projects = new Set(DATA.projects.map((p) => p.id));
  for (const [p, o, r] of DATA.participations) {
    expect(projects.has(p), p).toBe(true);
    expect(orgs.has(o), o).toBe(true);
    expect(["principal", "partenaire", "collaborateur"]).toContain(r);
  }
});
test("members' coordinates and projects' axes make sense", () => {
  for (const m of MEMBERS) if (m.lat !== undefined) expect(Math.abs(m.lat) < 90 && Math.abs(m.lon!) < 180, m.id).toBe(true);
  for (const p of DATA.projects) expect(DATA.axes.some((a) => a.code === p.axis), p.id).toBe(true);
});
