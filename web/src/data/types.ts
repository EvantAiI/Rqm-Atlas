// La forme des données écrites par tools/build_data.py dans generated/ (les valeurs restent celles des CSV, en français).
export type Category = "Régulier" | "Associé" | "Usager – Industriel" | "Usager – Communautaire" | "Usager – Gouvernemental";
export type Role = "principal" | "partenaire" | "collaborateur";

export interface PublicationStats { total: number; maritime: number; openalex?: string; evidence?: string; hasDetail?: boolean }
export interface Organisation {
  id: string; name: string; acronym?: string; category?: Category; type?: string;
  address?: string; town?: string; province?: string; country?: string;
  website?: string; email?: string; phone?: string;
  lat?: number; lon?: number; precision?: string; publications?: PublicationStats;
  region?: string;   // le code de sa région administrative, déduit de son point (membres du Québec)
}
export interface Project {
  id: string; title: string; shortTitle?: string; year: number; programme: string;
  axis: string; secondaryAxes?: string[]; transversal?: boolean; pageUrl?: string; teaser?: string; description?: string;
}
export interface Axis { code: string; label: string; short: string; color: string }
export interface Dataset {
  generated: string; repository: string; publicationsDate: string; axes: Axis[]; programmes: Record<string, string>;
  regions: { code: string; name: string }[]; organisations: Organisation[]; projects: Project[];
  participations: [string, string, Role][];
}
export interface Article { year: number; citations: number; label?: string; journal?: string; title: string; url?: string }
export interface Detail { maritime: Article[] }
