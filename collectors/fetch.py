"""Requêtes HTTP des collecteurs, gardées en cache dans .cache/http/ (ignoré par git).

Chaque réponse est un fichier nommé d'après son URL ; un collecteur relancé relit le
cache tant que la réponse a moins de ttl_days jours, et n'interroge le réseau que pour
le reste, à une requête par seconde et par hôte au plus.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "http"
UA = "RQM-carte/1.0 (+https://github.com/EvantAiI/Rqm-Atlas)"
BROWSER_UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/131.0 Safari/537.36")

_last_call: dict[str, float] = {}
_throttle_lock = threading.Lock()


class RateLimited(RuntimeError):
    """Quota d'API atteint : on arrête proprement plutôt que de marteler le service."""


def throttle(host: str, min_interval: float = 1.0) -> None:
    """Une requête par min_interval secondes et par hôte (règles de Nominatim et d'OpenAlex)."""
    with _throttle_lock:
        prev = _last_call.get(host, 0.0)
        wait = min_interval - (time.time() - prev)
        _last_call[host] = time.time() + max(wait, 0.0)
    if wait > 0:
        time.sleep(wait)


def cache_key(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:20]


def env(name: str) -> str | None:
    """Réglage personnel du collecteur : la variable d'environnement name, sinon la ligne
    name=… du fichier .env à la racine du dépôt (ignoré par git) ; None s'il est absent.
    Clés lues : OPENALEX_API_KEY (clé API OpenAlex gratuite, openalex.org/settings/api :
    dix fois le budget sans clé) et CONTACT_EMAIL (adresse de contact donnée à OpenAlex)."""
    if os.environ.get(name):
        return os.environ[name].strip()
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'") or None
    return None


def decompress(raw: bytes, encoding: str) -> bytes:
    """urllib ne décompresse rien, et certains serveurs envoient du gzip sans qu'on le
    demande : on se fie aux octets magiques autant qu'à l'en-tête."""
    encoding = encoding.lower()
    if raw[:2] == b"\x1f\x8b" or "gzip" in encoding:
        try:
            return gzip.decompress(raw)
        except OSError:
            return raw
    if "deflate" in encoding:
        try:
            return zlib.decompress(raw)
        except zlib.error:
            return zlib.decompress(raw, -zlib.MAX_WBITS)
    return raw


def fetch(url: str, *, ttl_days: int = 30, timeout: int = 30,
          min_interval: float = 1.0, accept: str | None = None,
          retries: int = 3) -> str | None:
    """GET avec cache disque et reprises ; None si l'URL reste injoignable.

    Les erreurs réseau passagères sont fréquentes sur quelques centaines de sites : on
    réessaie avec un délai croissant avant de déclarer le site injoignable.
    """
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / cache_key(url)
    if path.exists() and (time.time() - path.stat().st_mtime) < ttl_days * 86400:
        return path.read_text(encoding="utf-8", errors="replace")
    # Un échec définitif est retenu 12 h : sinon chaque site mort coûte trois essais de 30 s
    # à chaque passage.
    failed = path.with_suffix(".failed")
    if failed.exists() and (time.time() - failed.stat().st_mtime) < 12 * 3600:
        return None

    host = urllib.parse.urlsplit(url).netloc
    agents = [UA, BROWSER_UA]          # certains sites refusent un UA de robot
    last_error = None

    for attempt in range(retries):
        throttle(host, min_interval)
        headers = {"User-Agent": agents[min(attempt, len(agents) - 1)],
                   "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
                   "Accept-Encoding": "gzip, deflate"}
        if accept:
            headers["Accept"] = accept
        if host == "api.openalex.org":
            key = env("OPENALEX_API_KEY")
            if key:
                # en-tête plutôt que paramètre d'URL : la clé ne finit ni dans le cache (indexé
                # par URL) ni dans les journaux
                headers["Authorization"] = f"Bearer {key}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                charset = resp.headers.get_content_charset() or "utf-8"
                raw = decompress(resp.read(), resp.headers.get("Content-Encoding", ""))
                body = raw.decode(charset, errors="replace")
            path.write_text(body, encoding="utf-8")
            return body
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                retry_after = exc.headers.get("Retry-After")
                raise RateLimited(
                    f"HTTP 429 sur {url}"
                    + (f" (réessai dans {retry_after}s)" if retry_after else "")) from exc
            if exc.code == 403 and attempt + 1 < retries:
                last_error = "HTTP 403"
                continue                # on retente avec l'UA navigateur
            last_error = f"HTTP {exc.code}"
            break                       # 404, 410… inutile d'insister
        except Exception as exc:  # noqa: BLE001 - réseau capricieux
            reason = getattr(exc, "reason", exc)
            last_error = f"{type(exc).__name__}: {str(reason)[:60]}"
        if attempt + 1 < retries:
            time.sleep(2 ** attempt * 1.5)

    print(f"  ! {last_error} sur {url}")
    failed.touch()
    return None


def fetch_json(url: str, **kw) -> dict | list | None:
    body = fetch(url, accept="application/json", **kw)
    if body is None:
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None
