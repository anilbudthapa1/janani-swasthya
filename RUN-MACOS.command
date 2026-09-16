#!/usr/bin/env bash
set -Eeuo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

info() { printf "[Janani] %s\n" "$*"; }
fail() { printf "[Janani] ERROR: %s\n" "$*" >&2; printf "Press Return to close..."; read -r; exit 1; }

install_docker_desktop() {
  info "Docker Desktop is not installed. Installing it now..."

  if command -v brew >/dev/null 2>&1; then
    brew install --cask docker
    return
  fi

  case "$(uname -m)" in
    arm64) docker_url="https://desktop.docker.com/mac/main/arm64/Docker.dmg" ;;
    x86_64) docker_url="https://desktop.docker.com/mac/main/amd64/Docker.dmg" ;;
    *) fail "Unsupported Mac processor. Install Docker Desktop manually and run this file again." ;;
  esac

  temp_dir="$(mktemp -d)"
  trap 'hdiutil detach /Volumes/Docker >/dev/null 2>&1 || true; rm -rf "$temp_dir"' EXIT
  curl -fL "$docker_url" -o "$temp_dir/Docker.dmg"
  hdiutil attach "$temp_dir/Docker.dmg" -nobrowse
  sudo /Volumes/Docker/Docker.app/Contents/MacOS/install
  hdiutil detach /Volumes/Docker
  rm -rf "$temp_dir"
  trap - EXIT
}

command -v docker >/dev/null 2>&1 || install_docker_desktop

info "Starting Docker Desktop..."
open -a Docker || fail "Docker Desktop could not be opened."

info "Waiting for Docker Desktop. Accept its licence prompt if this is the first launch."
docker_ready=0
for _ in $(seq 1 150); do
  if docker info >/dev/null 2>&1; then
    docker_ready=1
    break
  fi
  sleep 2
done

[[ "$docker_ready" -eq 1 ]] || fail "Docker Desktop was not ready after five minutes. Complete its first-run setup, then run this file again."
docker compose version >/dev/null 2>&1 || fail "Docker Compose is missing. Update Docker Desktop and run this file again."

info "Building and starting Janani Swasthya..."
docker compose up --build -d

info "Waiting for the website..."
site_ready=0
for _ in $(seq 1 60); do
  if curl -fsS http://localhost:4000/api/health >/dev/null 2>&1; then
    site_ready=1
    break
  fi
  sleep 2
done

if [[ "$site_ready" -ne 1 ]]; then
  docker compose logs --tail=80 app
  fail "The website did not become ready. The latest app logs are shown above."
fi

open http://localhost:4000
printf "\nJanani Swasthya is running: http://localhost:4000\n"
printf "Worker:     worker@janani.gov.np      Password: Admin@123\n"
printf "Supervisor: supervisor@janani.gov.np  Password: Admin@123\n"
printf "Admin:      admin@janani.gov.np       Password: Admin@123\n\n"
printf "You may close this window. Stop later with: docker compose down\n"
