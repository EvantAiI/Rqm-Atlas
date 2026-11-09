import { DATA, PROGRAMMES } from "../data/dataset";
import { forTouch } from "../utils/format";

// Les bulles d'aide : ce qu'un visiteur se demande devant les données les plus importantes.
const TEXTS = {
  // d'après rqm.quebec/membres : Associé, « actifs en recherche » (des firmes de génie-conseil) ; Usager, « actifs dans le
  // développement du secteur maritime » (armateurs, ports, pêche)
  categories: "Régulier : une université, un collège ou un CCTT, actif en recherche maritime.\n"
    + "Associé : une entreprise ou un centre actif en recherche maritime, comme une firme de génie-conseil.\n"
    + "Usager : un acteur du secteur maritime, comme un armateur, un port ou une entreprise de pêche.",
  collaborations: "Un trait relie deux villes dont les membres mènent des projets ensemble.\n\n"
    + "Plus le trait est épais, plus ces projets sont nombreux. Sa couleur est celle de leur axe de recherche le plus fréquent.\n\n"
    + "Sans sélection, la carte montre les 25 liens les plus forts. Cliquez un trait pour voir ses projets.",
  axisBreakdown: "Chaque pastille est un axe de recherche. Son nombre compte les projets de ce membre dont c'est l'axe principal.\n\n"
    + "Cliquez une pastille pour ne garder que ces projets, ici et sur la carte.",
  roles: "Porteur : l'organisation où travaille le chercheur principal du projet.\n\n"
    + "Partenaire ou collaborateur : une autre organisation nommée dans le projet.\n\n"
    + "Quand plusieurs chercheurs d'une même organisation participent à un projet, on retient son rôle le plus fort.",
  axes: `Le RQM range ses projets en ${DATA.axes.length} axes de recherche :\n${DATA.axes.map((a) => `• ${a.short} : ${a.label.charAt(0).toLowerCase()}${a.label.slice(1)}`).join("\n")}\n\n`
    + "Chaque projet a un axe principal, parfois des axes secondaires.",
  mainAxisOnly: "Sans cette case, un projet compte aussi quand l'axe choisi est l'un de ses axes secondaires.",
  programmes: `Les programmes qui financent les projets du RQM\u00a0:\n\n${PROGRAMMES.map((p) => DATA.programmes[p]?.split(/(?<=\.) /)[0]).filter(Boolean).join("\n\n")}\n\n`
    + "Un programme choisi, ce « ? » le décrit en entier.",
  publications: "Le premier nombre compte les articles de ce membre classés en océanographie et sciences aquatiques par OpenAlex, une base ouverte de publications scientifiques.\n\n"
    + "Le second compte toutes ses publications dans OpenAlex.",
  outsideNetwork: "Ces organisations participent à ces projets sans être membres du RQM.\n\nElles n'ont donc pas de point sur la carte.",
  nearby: "C'est le membre qui a le plus de projets du RQM à moins de 50 km de vous. À égalité, on choisit le plus proche.\n\n"
    + "Votre position reste dans votre navigateur.",
};
// sur téléphone, « Cliquez » devient « Touchez »
export const HELP_TEXTS = Object.fromEntries(Object.entries(TEXTS).map(([k, t]) => [k, forTouch(t)])) as Record<keyof typeof TEXTS, string>;
