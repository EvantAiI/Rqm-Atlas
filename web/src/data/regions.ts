// Les lieux des organisations, en règles pures (le build s'en sert aussi).
// La commune d'une ville : « Rimouski (Le Bic) » est à Rimouski. Les fiches de ville et la recherche parlent de communes ;
// les bulles et les points gardent le quartier.
export const municipality = (name: string | undefined) => String(name || "").replace(/ \(.*\)$/, "");

// Ce que la carte montre : l'Est du Canada et ses abords (Ottawa, Toronto, les Maritimes). Plus loin (Vancouver,
// Montpellier…), on ne suivrait pas un trait jusqu'à un membre : il n'a pas de point, il est nommé dans le panneau.
export const isInEast = (lon: number) => lon > -80 && lon < -55;
export const isOnMap = (lon: number, lat: number) => isInEast(lon) && lat > 36 && lat < 63;
export const isOffMap = (o: { lat?: number; lon?: number }) => o.lat !== undefined && o.lon !== undefined && !isOnMap(o.lon, o.lat);
