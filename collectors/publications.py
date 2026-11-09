#!/usr/bin/env python3
"""Publications scientifiques des membres du RQM, selon OpenAlex, dans collected/publications.json.

    python3 collectors/publications.py          # relève et écrit collected/publications.json, daté
    python3 collectors/publications.py --demo   # contrôle hors ligne de la comparaison de sites

Lit data/organisations.csv (par tools/validate.py) : les membres qui ont une catégorie et un
site web. Interroge ROR (api.ror.org) et OpenAlex (api.openalex.org ; clé facultative,
OPENALEX_API_KEY, et adresse de contact CONTACT_EMAIL, lues par fetch.env). Écrit collected/publications.json :
{"source", "date", "membres": {id: {"openalex", "nb_publications", "nb_maritimes",
"preuve_maritimes", "maritimes": [{"titre", "annee", "url", "revue", "citations", "etiquette"}]}}}.
Le fichier est gardé dans le dépôt : la carte affiche « selon OpenAlex, relevé du … » et se
construit sans réseau. Relancer le script met le relevé et sa date à jour (quelques fois par an) ;
s'il casse (OpenAlex change), la carte garde le dernier relevé.

Un membre n'est relié à une fiche ROR, donc à une institution OpenAlex, que si le site web
inscrit dans la fiche ROR est le sien : même hôte (« www. » ignoré) que l'URL du membre ou que
l'URL canonique que cette page déclare sur un autre hôte (www.ismer.ca renvoie vers
uqar.ca/institut-des-sciences-de-la-mer-ismer/, le site inscrit dans la fiche ROR de l'ISMER).
Un sous-domaine n'est pas le même site : cen.ulaval.ca n'est pas l'Université Laval. Quand un
hôte est partagé (UQAR et ISMER, Espace pour la vie et le Biodôme) ou que l'URL du membre est
une page profonde (uqar.ca/recherche/…/cermim), le chemin doit aussi être identique, aux
segments de langue et pages d'accueil près. Sinon, pas de publications : plutôt rien que du faux.
Aucun nom n'est comparé : un appariement par les noms reliait « Alliance verte » à Digital
Research Alliance of Canada.

Les publications viennent du filtre strict authorships.institutions.ror (pas lineage, qui
compterait les filiales : UQAR ⊃ ISMER). Les travaux « maritimes » sont ceux que le
primary_topic d'OpenAlex range dans les sous-champs Oceanography (1910) ou Aquatic Science
(1104) : le compte porte sur toutes les années, la liste sur les travaux depuis 2015.
"""
from __future__ import annotations

import datetime as dt
import functools
import html
import json
import os
import re
import sys
import urllib.parse
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "tools"))
from fetch import env, fetch, fetch_json  # noqa: E402

OUTPUT = ROOT / "collected" / "publications.json"
ROR_API = "https://api.ror.org/v2/organizations?"
OA_API = "https://api.openalex.org/"
# Segments d'URL qui ne désignent aucune unité : langue, page d'accueil.
HOME = re.compile(r"^(?:fr|en|fr-ca|en-ca|accueil|home|index|default)(?:\.[a-z0-9]+)?$")
SUBFIELDS = ("1910", "1104")    # Oceanography, Aquatic Science
SINCE = "2015-01-01"
CAP = 2000                      # travaux par membre : garde-fou si un filtre ramenait tout


def short(identifier: str) -> str:
    return identifier.rsplit("/", 1)[-1]


# --- Comparaison de sites -------------------------------------------------

def site_key(url: str) -> tuple[str, tuple[str, ...]]:
    """Hôte sans « www. », et segments du chemin sans langue ni page d'accueil."""
    parts = urllib.parse.urlsplit(url.strip().lower())
    host = parts.hostname or ""
    if host.startswith("www."):
        host = host[4:]
    return host, tuple(s for s in parts.path.split("/") if s and not HOME.match(s))


def same_site(member_url: str, ror_url: str, shared_host: bool) -> bool:
    """Même hôte ; et même chemin dès que l'hôte est partagé ou que l'URL du membre est une
    page profonde. Un membre à la racine de son domaine n'a pas à recopier la page d'accueil
    biscornue de sa fiche ROR (/scripto.asp?…)."""
    (host, path), (ror_host, ror_path) = site_key(member_url), site_key(ror_url)
    if not host or host != ror_host:
        return False
    return path == ror_path if (shared_host or path) else True


def canonical(page: str | None) -> str | None:
    """URL canonique (ou og:url) que la page déclare sur elle-même."""
    for tag in re.findall(r"(?is)<(?:link|meta)\b[^>]*>", page or ""):
        if re.search(r"""(?i)rel=["']canonical["']|property=["']og:url["']""", tag):
            found = re.search(r"""(?i)(?:href|content)=["'](https?://[^"']+)""", tag)
            if found:
                return html.unescape(found.group(1))
    return None


# --- ROR --------------------------------------------------------------------

def websites(record: dict) -> list[str]:
    return [l["value"] for l in record.get("links") or [] if l.get("type") == "website" and l.get("value")]


@functools.lru_cache(maxsize=None)
def ror_records(host: str) -> tuple[dict, ...]:
    """Fiches ROR dont un site web est exactement sur cet hôte. La recherche par phrase
    ramène aussi les sous-domaines et les homonymes : on refiltre."""
    found, page = [], 1
    while page <= 5:
        url = ROR_API + urllib.parse.urlencode({"query.advanced": f'links.value:"{host}"', "page": page})
        answer = fetch_json(url, ttl_days=90, min_interval=0.4) or {}
        items = answer.get("items") or []
        found += items
        if not items or len(found) >= answer.get("number_of_results", 0):
            break
        page += 1
    return tuple(r for r in found if any(site_key(s)[0] == host for s in websites(r)))


def member_urls(member: dict) -> list[str]:
    """L'URL du membre, puis l'URL canonique que cette page déclare si elle est sur un autre
    hôte : elle dit où le site a déménagé. Sur le même hôte, une page disparue renvoie souvent
    à l'accueil, qui ne prouverait pas que le membre possède le domaine."""
    urls = [member["url"]]
    canon = canonical(fetch(member["url"], ttl_days=30))
    if canon and site_key(canon)[0] != site_key(member["url"])[0]:
        urls.append(canon)
    return urls


def match(members: list[dict]) -> dict[str, dict]:
    """id du membre -> la fiche ROR dont un site est le sien, quand il y en a exactement une."""
    urls = {m["id"]: member_urls(m) for m in members}
    members_per_host = Counter(site_key(u)[0] for urls_ in urls.values() for u in urls_)
    matched = {}
    for m in members:
        candidates = {}
        for u in urls[m["id"]]:
            host = site_key(u)[0]
            records = ror_records(host) if host else ()
            shared = len(records) > 1 or members_per_host[host] > 1
            for record in records:
                if any(same_site(u, site, shared) for site in websites(record)):
                    candidates[record["id"]] = record
        if len(candidates) == 1:
            matched[m["id"]] = next(iter(candidates.values()))
    # Une même fiche revendiquée par deux membres : l'un des deux se trompe, on ne devine pas.
    claims = Counter(r["id"] for r in matched.values())
    return {mid: r for mid, r in matched.items() if claims[r["id"]] == 1}


# --- OpenAlex ---------------------------------------------------------------

def openalex(path: str, **params) -> dict:
    """Requête filtrée (un crédit). L'adresse de contact (CONTACT_EMAIL) entre dans l'URL si elle
    est donnée ; la clé part en en-tête (fetch.py), jamais dans l'URL, donc jamais dans le cache."""
    if env("CONTACT_EMAIL"):
        params["mailto"] = env("CONTACT_EMAIL")
    return fetch_json(OA_API + path + "?" + urllib.parse.urlencode(params), ttl_days=14, min_interval=1.0) or {}


def institutions(rors: list[str]) -> dict[str, dict]:
    """Fiche OpenAlex par identifiant ROR court, par lots de 50 (un crédit le lot)."""
    found: dict[str, dict] = {}
    for start in range(0, len(rors), 50):
        answer = openalex("institutions", filter="ror:" + "|".join(rors[start:start + 50]),
                          select="id,ror,display_name,works_count,cited_by_count,homepage_url,geo",
                          **{"per-page": 50})
        for inst in answer.get("results", []):
            ror = short(inst.get("ror") or "")
            if ror in found:
                print(f"  ! deux fiches OpenAlex pour ror.org/{ror} : {found[ror]['id']} et {inst['id']}")
            found.setdefault(ror, inst)
    return found


def maritime_count(ror: str) -> int:
    """Travaux de l'institution, toutes années, rangés dans SUBFIELDS (un group_by par sous-champ ;
    200 groupes au plus, les plus petits sous-champs d'une grande université peuvent manquer)."""
    r = openalex("works", filter=f"authorships.institutions.ror:{ror}",
                 group_by="primary_topic.subfield.id", **{"per-page": 200})
    return sum(g["count"] for g in r.get("group_by", []) if short(g["key"]) in SUBFIELDS)


def maritime_filter(ror: str) -> str:
    return f"authorships.institutions.ror:{ror},primary_topic.subfield.id:{'|'.join(SUBFIELDS)}"


def maritime_evidence(ror: str) -> str:
    """La même liste sur le site d'OpenAlex, toutes années : le lien « preuve » de la carte."""
    return f"https://openalex.org/works?filter={maritime_filter(ror)}"


def works_list(raw: list[dict]) -> list[dict]:
    """Travaux OpenAlex bruts -> un seul par id, année puis citations décroissantes."""
    unique = {w["id"]: w for w in raw if w.get("id")}
    works = [{"titre": w.get("title"), "annee": w.get("publication_year"),
              "url": w.get("doi") or w["id"],
              "revue": ((w.get("primary_location") or {}).get("source") or {}).get("display_name"),
              "citations": w.get("cited_by_count") or 0,
              "etiquette": ((w.get("primary_topic") or {}).get("subfield") or {}).get("display_name")}
             for w in unique.values()]
    return sorted(works, key=lambda f: (-(f["annee"] or 0), -f["citations"]))


def maritime_works(ror: str) -> list[dict]:
    """Les travaux maritimes depuis SINCE, par pages de 200 (curseur), chaque page en cache.
    url : le DOI, sinon la fiche OpenAlex ; etiquette : le nom du sous-champ."""
    raw, cursor, count = [], "*", None
    while cursor:
        r = openalex("works", filter=f"{maritime_filter(ror)},from_publication_date:{SINCE}",
                     sort="publication_date:desc",
                     select="id,doi,title,publication_year,primary_location,cited_by_count,primary_topic",
                     **{"per-page": 200, "cursor": cursor})
        if count is None:
            count = (r.get("meta") or {}).get("count")
        raw += r.get("results") or []
        cursor = (r.get("meta") or {}).get("next_cursor") if r.get("results") else None
        if len(raw) >= CAP:
            print(f"  ! ror.org/{ror} : plus de {CAP} travaux maritimes, liste tronquée aux plus récents")
            break
    works = works_list(raw)
    if count is not None and len(works) != count and len(raw) < CAP:
        print(f"  ! ror.org/{ror} : OpenAlex annonce {count} travaux maritimes, {len(works)} listés")
    return works


def members() -> list[dict]:
    """Les membres de data/organisations.csv qui ont une catégorie et un site web."""
    import validate
    data, report = validate.load(ROOT)
    if report.errors:
        raise SystemExit("data/ contient des erreurs : python3 tools/validate.py")
    return [{"id": o["id"], "url": o["site_web"]} for o in data["organisations"] if o["categorie"] and o["site_web"]]


def main() -> None:
    matched = match(members())
    found = institutions(sorted({short(r["id"]) for r in matched.values()}))
    out = {}
    for mid, record in sorted(matched.items()):
        ror = short(record["id"])
        inst = found.get(ror)
        if not inst:
            continue
        n = maritime_count(ror)
        out[mid] = {"openalex": inst["id"], "nb_publications": inst["works_count"], "nb_maritimes": n,
                    "preuve_maritimes": maritime_evidence(ror) if n else "",
                    "maritimes": maritime_works(ror) if n else []}
    tmp = OUTPUT.with_suffix(".tmp")
    tmp.write_text(json.dumps({"source": "OpenAlex", "date": dt.date.today().isoformat(), "membres": out},
                              ensure_ascii=False, indent=0, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(tmp, OUTPUT)
    print(f"{len(out)} membres appariés à OpenAlex, {sum(1 for m in out.values() if m['nb_maritimes'])} "
          f"avec des travaux maritimes (collected/publications.json)")


def demo() -> None:
    """Contrôle de la seule logique non triviale : quand deux URL sont le même site."""
    # « www. » ignoré
    assert same_site("http://www.uqar.ca/", "https://uqar.ca", False)
    # un sous-domaine n'est pas le même site
    assert not same_site("https://www.cen.ulaval.ca/", "https://www.ulaval.ca", False)
    assert not same_site("https://ismer.uqar.ca/", "https://www.uqar.ca", False)
    # domaine différent
    assert not same_site("https://www.bio-laurentia.com/", "http://www.bio.gc.ca/index-en.php", False)
    # hôte partagé : le chemin tranche entre l'UQAR et l'ISMER
    ismer = "https://www.uqar.ca/institut-des-sciences-de-la-mer-ismer/"
    assert same_site(ismer, ismer, True) and not same_site(ismer, "https://www.uqar.ca", True)
    assert same_site("http://www.uqar.ca/", "https://www.uqar.ca", True) and not same_site("http://www.uqar.ca/", ismer, True)
    # langue et page d'accueil ignorées, pas le reste
    assert same_site("https://www.concordia.ca/fr.html", "https://www.concordia.ca/", True)
    assert not same_site("https://www.concordia.ca/fr.html", "https://www.concordia.ca/press.html", True)
    assert same_site("https://espacepourlavie.ca/biodome", "http://espacepourlavie.ca/en/biodome", True)
    assert not same_site("https://espacepourlavie.ca/biodome", "http://espacepourlavie.ca/en", True)
    # une page profonde du membre n'est jamais assimilée au propriétaire du domaine
    assert not same_site("https://www.crosemont.qc.ca/cerse", "http://www.crosemont.qc.ca/accueil", False)
    # mais la page d'accueil biscornue d'une fiche ROR n'empêche rien
    assert same_site("https://www.cegeplapocatiere.qc.ca/",
                     "http://www.cegeplapocatiere.qc.ca/MyScriptorWeb/scripto.asp?resultat=533169", False)
    assert site_key("HTTP://WWW.Exemple.CA:443/FR/index.html?x=1#y") == ("exemple.ca", ())
    assert canonical('<html><head><link rel="canonical" href="https://a.ca/b/" /></head>') == "https://a.ca/b/"
    assert canonical('<meta property="og:url" content="https://a.ca/c">') == "https://a.ca/c"
    assert canonical('<link href="/relative" rel="canonical">') is None
    assert canonical("<p>rien</p>") is None and canonical(None) is None
    # la preuve affichée et la liste datée désignent les mêmes travaux
    assert maritime_evidence("05wn3mp32") == ("https://openalex.org/works?filter=authorships.institutions.ror:05wn3mp32,"
                                              "primary_topic.subfield.id:1910|1104")
    oce = {"subfield": {"id": "https://openalex.org/subfields/1910", "display_name": "Oceanography"}}
    aqu = {"subfield": {"id": "https://openalex.org/subfields/1104", "display_name": "Aquatic Science"}}
    w1 = {"id": "https://openalex.org/W1", "doi": "https://doi.org/10.1/a", "title": "A", "publication_year": 2020,
          "cited_by_count": 5, "primary_location": {"source": {"display_name": "Revue A"}}, "primary_topic": oce}
    w2 = {"id": "https://openalex.org/W2", "doi": None, "title": "B", "publication_year": 2021,
          "cited_by_count": 0, "primary_location": None, "primary_topic": aqu}
    w3 = {"id": "https://openalex.org/W3", "doi": "https://doi.org/10.1/c", "title": "C", "publication_year": 2020,
          "cited_by_count": 9, "primary_location": {"source": None}, "primary_topic": oce}
    l = works_list([w1, w2, w3, dict(w1)])          # W1 en double (deux pages qui se chevauchent)
    assert [t["url"] for t in l] == ["https://openalex.org/W2", "https://doi.org/10.1/c", "https://doi.org/10.1/a"]
    assert l[0] == {"titre": "B", "annee": 2021, "url": "https://openalex.org/W2", "revue": None,
                    "citations": 0, "etiquette": "Aquatic Science"}
    assert l[2]["revue"] == "Revue A" and l[2]["etiquette"] == "Oceanography" and works_list([]) == []
    print("demo: ok")


if __name__ == "__main__":
    demo() if "--demo" in sys.argv else main()
