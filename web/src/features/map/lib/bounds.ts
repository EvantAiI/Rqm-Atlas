// Les limites de la carte, en degrés : où elle se déplace, et quels lieux elle cadre et relie.
type LngLat = [number, number];
const WEST = -90, EAST = -50, NORTH = 63;
// Le fond descend à 38° N jusqu'au zoom 6 (la vue d'ensemble, collected/basemap-south.pmtiles), à 43° N au-delà.
export const BASE_SOUTH = 38, DETAILED_SOUTH = 43, SOUTH_MAX_ZOOM = 6;
const SOUTH_UNDER_SHEET = 15;    // téléphone, fiche ouverte : la zone sans fond reste sous la feuille

// La latitude du bord nord d'une tuile.
export const tileNorth = (z: number, y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

// La borne sud suit le zoom : on ne voit jamais au sud du fond qu'on a.
export const maxBounds = (zoom: number, underSheet = false): [LngLat, LngLat] =>
  [[WEST, underSheet ? SOUTH_UNDER_SHEET : zoom < SOUTH_MAX_ZOOM + 1 ? BASE_SOUTH : DETAILED_SOUTH - 0.4], [EAST, NORTH]];
// L'Est du Canada : ce que la carte cadre (Vancouver ou Montpellier n'emportent pas le cadre).
export const isInEast = (lon: number) => lon > -80 && lon < -55;
// Où un arc peut se suivre à l'écran.
export const isOnArcMap = ([lon, lat]: LngLat) => isInEast(lon) && lat > 36 && lat < NORTH;
// L'emprise d'ouverture : les membres du Québec et des environs.
export const isInOpeningExtent = (lon: number, lat: number) => lat > 44.5 && lat < NORTH && lon > -80 && lon < -56;
