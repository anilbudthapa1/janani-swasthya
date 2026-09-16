#!/usr/bin/env bash
set -Eeuo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

green='\033[0;32m'
yellow='\033[1;33m'
red='\033[0;31m'
clear='\033[0m'

info() { printf "${green}[Janani]${clear} %s\n" "$*"; }
warn() { printf "${yellow}[Janani]${clear} %s\n" "$*"; }
fail() { printf "${red}[Janani] ERROR:${clear} %s\n" "$*" >&2; exit 1; }

install_docker() {
  info "Docker is not installed. Installing Docker Engine and Compose..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y docker.io ca-certificates curl
    sudo apt-get install -y docker-compose-v2 \
      || sudo apt-get install -y docker-compose-plugin \
      || sudo apt-get install -y docker-compose
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y docker docker-compose-plugin \
      || sudo dnf install -y docker docker-compose
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm docker docker-compose
  else
    fail "Automatic installation supports apt, dnf, and pacman. Install Docker Engine and Compose, then run this file again."
  fi
}

command -v docker >/dev/null 2>&1 || install_docker

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl enable --now docker >/dev/null 2>&1 || true
elif command -v service >/dev/null 2>&1; then
  sudo service docker start >/dev/null 2>&1 || true
fi

if docker compose version >/dev/null 2>&1; then
  compose_base=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose_base=(docker-compose)
else
  warn "Docker Compose is missing. Attempting to install it..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y docker-compose-v2 \
      || sudo apt-get install -y docker-compose-plugin \
      || sudo apt-get install -y docker-compose
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y docker-compose-plugin || sudo dnf install -y docker-compose
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm docker-compose
  fi

  if docker compose version >/dev/null 2>&1; then
    compose_base=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    compose_base=(docker-compose)
  else
    fail "Docker Compose could not be installed automatically."
  fi
fi

if docker info >/dev/null 2>&1; then
  compose_cmd=("${compose_base[@]}")
elif sudo docker info >/dev/null 2>&1; then
  compose_cmd=(sudo "${compose_base[@]}")
  warn "Using sudo because this account cannot access the Docker socket."
else
  fail "Docker is installed but the Docker service is not running. Start Docker and run this script again."
fi

info "Building and starting Janani Swasthya..."
"${compose_cmd[@]}" up --build -d

info "Waiting for the website..."
ready=0
for _ in $(seq 1 60); do
  if command -v curl >/dev/null 2>&1 && curl -fsS http://localhost:4000/api/health >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  "${compose_cmd[@]}" logs --tail=80 app
  fail "The website did not become ready. The latest app logs are shown above."
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://localhost:4000 >/dev/null 2>&1 || true
fi

printf "\n${green}Janani Swasthya is running:${clear} http://localhost:4000\n"
printf "Worker:     worker@janani.gov.np      Password: Admin@123\n"
printf "Supervisor: supervisor@janani.gov.np  Password: Admin@123\n"
printf "Admin:      admin@janani.gov.np       Password: Admin@123\n\n"
printf "Stop later with: %s down\n" "${compose_base[*]}"
