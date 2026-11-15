import { expect, test } from "vitest";
import { ORG_BY_ID, PARTNERS_BY_ORG, projectOrgs, starPartners } from "./dataset";
import { MUNICIPALITIES } from "./placement";
import { mainTown } from "./towns";

test("a bubble or a cluster opens the municipality that holds most of its members, a district counting for its town", () => {
  const rimouski = MUNICIPALITIES.get("Rimouski")!.ids, matane = MUNICIPALITIES.get("Matane")!.ids;
  expect(mainTown([matane[0], ...rimouski.slice(0, 2)])).toBe("Rimouski");
  const district = rimouski.find((id) => ORG_BY_ID.get(id)!.town !== "Rimouski");
  if (district) expect(mainTown([district])).toBe("Rimouski");
});

// L'étoile : dans un projet, le porteur est relié à chaque participant, un participant au seul porteur.
test("in a project, the lead is linked to every participant, a participant only to the lead", () => {
  expect(starPartners("UQTR", "PLAINE-2023PS01")).toEqual(["UdeM"]);
  expect(starPartners("UdeM", "PLAINE-2023PS01").length).toBe(projectOrgs("PLAINE-2023PS01").length - 1);
});

// La fiche d'un membre et ses couleurs suivent la même étoile que les traits : deux participants ne sont pas partenaires.
test("a member's partners are its star partners among members, both ways, the richest first", () => {
  expect((PARTNERS_BY_ORG.get("UQTR") || []).some((x) => x.other === "UdeM" && x.projects.includes("PLAINE-2023PS01"))).toBe(true);
  for (const [id, list] of PARTNERS_BY_ORG) {
    for (const { other, projects } of list) {
      expect(ORG_BY_ID.get(other)!.category).toBeTruthy();
      for (const p of projects) expect(starPartners(id, p)).toContain(other);
      expect(PARTNERS_BY_ORG.get(other)!.some((x) => x.other === id)).toBe(true);
    }
    for (let i = 1; i < list.length; i++) expect(list[i - 1].projects.length).toBeGreaterThanOrEqual(list[i].projects.length);
  }
});
