// Les catégories de la liste des membres du RQM ; « Usager » en réunit trois. Pur : la couleur est un jeton de
// styles/index.css, lu là où l'on dessine (var(--color-…) en CSS, cssColour() sur la carte).
import type { Category, Organisation, Role } from "./types";

export interface CategoryInfo { code: Category; label: string; token: string; isUser?: boolean }
export const CATEGORIES: CategoryInfo[] = [
  { code: "Régulier", label: "Régulier", token: "--color-regular" },
  { code: "Associé", label: "Associé", token: "--color-associate" },
  { code: "Usager – Industriel", label: "Industriel", token: "--color-industrial", isUser: true },
  { code: "Usager – Communautaire", label: "Communautaire", token: "--color-community", isUser: true },
  { code: "Usager – Gouvernemental", label: "Gouvernemental", token: "--color-government", isUser: true },
];
export const CATEGORY_BY_CODE = new Map(CATEGORIES.map((c) => [c.code, c]));
export const CATEGORY_RANK = new Map(CATEGORIES.map((c, i) => [c.code, i]));
export const USER_CATEGORIES = CATEGORIES.filter((c) => c.isUser);
// La couleur d'une catégorie en CSS.
export const categoryColour = (c: CategoryInfo) => `var(${c.token})`;
// Ce que veut dire chaque catégorie, en clair, à côté de sa case.
export const CATEGORY_MEANING: Partial<Record<Category, string>> = { "Régulier": "universités et collèges", "Associé": "entreprises et centres" };
// Le rôle d'une organisation dans un projet : « principal », elle accueille le chercheur principal.
export const ROLE_LABELS: Record<Role, string> = { principal: "Porteur", partenaire: "Partenaire", collaborateur: "Collaborateur" };
export const ROLE_LABELS_PLURAL: Record<Role, string> = { principal: "Porteurs", partenaire: "Partenaires", collaborateur: "Collaborateurs" };
export const ROLES = Object.keys(ROLE_LABELS) as Role[];
// Des participations rangées par rôle, porteurs d'abord ; les rôles vides sont omis.
export const groupByRole = <T extends { role: Role }>(items: T[]) =>
  ROLES.map((role) => [role, items.filter((x) => x.role === role)] as const).filter(([, l]) => l.length);

export const categoryLabel = (o: Organisation) => (o.category
  ? `Membre ${o.category.startsWith("Usager") ? `usager ${o.category.split("– ")[1].toLowerCase()}` : o.category.toLowerCase()}`
  : "Organisation hors du réseau");
