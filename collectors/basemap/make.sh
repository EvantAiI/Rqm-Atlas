#!/bin/sh
# Refait le fond de carte : collected/basemap.pmtiles, collected/basemap-south.pmtiles (tuiles)
# et collected/basemap-style.json (style MapLibre). Rarement : le fond ne change que pour des
# données OpenStreetMap plus récentes, ou quand des membres arrivent (le détail les suit).
#
# Il faut pmtiles (https://github.com/protomaps/go-pmtiles, v1.31.2), tile-join (paquet
# tippecanoe), node et npm. Rien de cela ne sert à construire le site.
#
#   python3 tools/build_data.py                 # d'abord : les membres se lisent dans web/generated/data.json
#   collectors/basemap/make.sh 20261105         # la date d'un build de https://build.protomaps.com
#
# Ce qu'on garde, pour tenir sous 45 Mo dans le dépôt :
# - tout le territoire (lon -80 à -55, lat 43 à 63) jusqu'au zoom 8 ;
# - au sud (lat 38 à 43) jusqu'au zoom 6 seulement, dans basemap-south.pmtiles : la vue d'ensemble
#   sur téléphone descend jusque-là, la page n'y demande rien de plus près ;
# - le couloir habité (jusqu'à la latitude 52,5) au zoom 9 ; au-delà, la carte agrandit les
#   tuiles du zoom 9 ;
# - autour des membres seulement, du zoom 12 au 15 (la rue) : les tuiles du zoom 12 à moins de
#   1 km d'un membre (extents.py), et toutes leurs descendantes. La page ne demande que
#   celles-là (web/generated/coverage.json) ;
# - les couches terre, eau, routes, lieux et limites ; ni bâtiments, ni commerces, ni
#   transports, ni occupation du sol.
# Polices (Noto Sans, OFL) et icônes : https://github.com/protomaps/basemaps-assets, copiées
# telles quelles dans web/public/basemap/fonts et web/public/basemap/sprites.
set -eu
build=${1:?date du build Protomaps, AAAAMMJJ}
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
src=https://build.protomaps.com/$build.pmtiles
pmtiles extract "$src" "$tmp/all.pmtiles" --bbox=-80,43,-55,63 --maxzoom=8
pmtiles extract "$src" "$tmp/south.pmtiles" --bbox=-80,38,-55,43 --maxzoom=6
pmtiles extract "$src" "$tmp/corridor.pmtiles" --bbox=-80,43,-55,52.5 --minzoom=9 --maxzoom=9
python3 "$here/extents.py" "$root/web/generated/data.json" > "$tmp/extents.geojson"
pmtiles extract "$src" "$tmp/detail.pmtiles" --region="$tmp/extents.geojson" --minzoom=12 --maxzoom=15
for f in all south corridor detail; do
  tile-join -q -f -o "$tmp/$f-m.pmtiles" -L pois -L buildings -L transit -L landuse -L landcover "$tmp/$f.pmtiles"
done
cp "$tmp/south-m.pmtiles" "$root/collected/basemap-south.pmtiles"
tile-join -q -f -o "$root/collected/basemap.pmtiles" "$tmp/all-m.pmtiles" "$tmp/corridor-m.pmtiles" "$tmp/detail-m.pmtiles"
# Le style : @protomaps/basemaps 5.7.2, variante claire, noms en français.
cp "$here/style.mjs" "$tmp/"
(cd "$tmp" && npm init -y >/dev/null && npm i -s @protomaps/basemaps@5.7.2 >/dev/null && node style.mjs "$root/collected/basemap-style.json")
ls -la "$root/collected/basemap.pmtiles" "$root/collected/basemap-south.pmtiles" "$root/collected/basemap-style.json"
