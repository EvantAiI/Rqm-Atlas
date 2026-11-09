#!/bin/sh
# Lance la CI de .github/workflows/site.yml en local, avec act et podman, comme
# GitHub le ferait sur un push : valider, tester, construire (la publication est
# sautée sous act). Prérequis : act, et le service podman de l'utilisateur
# (systemctl --user enable --now podman.socket). Arguments en plus : passés à act.
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"   # act y est installé
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock"
exec act push \
  --workflows .github/workflows/site.yml \
  -P ubuntu-24.04=docker.io/catthehacker/ubuntu:act-24.04 \
  --pull=false \
  --container-daemon-socket - \
  "$@"
