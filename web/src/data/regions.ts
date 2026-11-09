// Les lieux des organisations, en règles pures (le build s'en sert aussi).
// La commune d'une ville : « Rimouski (Le Bic) » est à Rimouski. Les fiches de ville et la recherche parlent de communes ;
// les bulles et les points gardent le quartier.
export const municipality = (name: string | undefined) => String(name || "").replace(/ \(.*\)$/, "");

// Hors du Québec (Ottawa, Toronto, Vancouver, Montpellier…) : trop loin pour la carte, nommés dans le panneau.
export const isOutsideQuebec = (o: { country?: string; province?: string }) => (o.country || "Canada") !== "Canada" || (o.province || "Québec") !== "Québec";
