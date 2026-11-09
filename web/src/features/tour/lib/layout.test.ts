import { expect, test } from "vitest";
import { layoutTour } from "./layout";

const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
const size = { width: 340, height: 200 };

test("the bubble goes right, left (level with the middle of the target), below, or in the middle", () => {
  expect(layoutTour(box(20, 100, 280, 40), size, false, 1440, 900, false).bubble).toEqual({ left: 322, top: 20 });
  expect(layoutTour(box(1200, 100, 200, 40), size, false, 1440, 900, false).bubble).toEqual({ left: 838, top: 20 });
  // la fiche, haute, à droite : la bulle à mi-hauteur, pas sur les boutons de zoom en haut de la carte
  expect(layoutTour(box(1020, 10, 410, 860), size, false, 1440, 900, false).bubble).toEqual({ left: 658, top: 340 });
  expect(layoutTour(box(20, 100, 350, 40), size, false, 390, 844, true).bubble).toEqual({ left: 20, top: 162 });
  const empty = layoutTour(null, size, false, 1440, 900, false);
  expect(empty.bubble).toEqual({ left: 550, top: 350 });
  expect(empty.hole).toEqual({ left: 720, top: 450, width: 0, height: 0 });
});

test("with the map lit, the bubble sits on the panel on a computer, on the side with more room on a phone", () => {
  expect(layoutTour(box(342, 10, 1088, 880), size, true, 1440, 900, false).bubble).toEqual({ left: 16, top: 350 });
  expect(layoutTour(box(10, 120, 370, 714), size, true, 390, 844, true).bubble).toEqual({ left: 16, top: 16 });
  // une fiche ouverte en bas : la bulle se pose sur elle, la carte entre le panneau et la fiche reste libre
  expect(layoutTour(box(10, 65, 370, 300), size, true, 390, 844, true).bubble).toEqual({ left: 16, top: 628 });
});
