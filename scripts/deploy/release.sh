#!/usr/bin/env bash
set -euo pipefail
umask 077
sha=$1
run=$2
[[ "$sha" =~ ^[0-9a-f]{40}$ && "$run" =~ ^[0-9]+-[0-9]+$ ]]
test "$(id -un)" = cdnn-deploy
base=/var/www/congdongngonngu/frontend
release="$base/.releases/$sha-$run"
test "$(pwd -P)" = "$release"
test "$(cat .source-sha)" = "$sha"
test "$(node -p 'process.versions.node.split(".")[0]')" = 24
exec 9> "$base/.deploy.lock"
flock -n 9 || { echo 'Application deployment is already running' >&2; exit 1; }
# One-time conversion of existing dist must be reviewed separately. Never replace a real directory automatically.
test -L "$base/dist" || { echo 'Reviewed dist symlink bootstrap required; no activation performed' >&2; exit 1; }
previous=$(readlink -f "$base/dist")
[[ "$previous" == "$base/.releases/"*/dist ]] && test -d "$previous"


npm ci --include=dev
VITE_API_BASE_URL=https://api.congdongngonngu.vn/api/v1 npm run build
npm audit --omit=dev --audit-level=moderate
node scripts/deploy/verify.cjs artifact
printf '{"sha":"%s"}\n' "$sha" > dist/cdnn-release.json

chmod 711 "$base/.releases" "$release"
find dist -type d -exec chmod 755 {} +
find dist -type f -exec chmod 644 {} +
# Static clients can retain old hashed entry/chunk URLs. Retain previous assets in the next artifact.
if test -d "$previous/assets"; then cp -an "$previous/assets/." dist/assets/; fi
test -f "$previous/cdnn-release.json" || { echo 'Previous release marker required for rollback' >&2; exit 1; }
activated=0
swap() {
  local destination=$1
  local link="$base/.dist-$sha-$run-$2"
  ln -s "$destination" "$link" && mv -Tf "$link" "$base/dist"
}
verify() {
  for attempt in $(seq 1 12); do
    if node scripts/deploy/verify.cjs "$1"; then return 0; fi
    sleep 5
  done
  return 1
}
record() {
  printf '{"sha":"%s","previous":"%s","timestamp":"%s","result":"%s"}\n' "$sha" "$previous" "$(date -u +%FT%TZ)" "$1" >> "$base/.deployment-ledger.jsonl"
}
recover() {
  local status=$?
  trap - EXIT INT TERM
  if (( activated )); then
    if swap "$previous" rollback && true &&
       verify "$(node -p 'require(process.argv[1]).sha' "$previous/cdnn-release.json")"; then
      record rolled_back
    else
      record rollback_failed
      echo 'Rollback verification failed; operator action required' >&2
    fi
  fi
  exit "$status"
}
trap recover EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
activated=1
swap "$release/dist" activation

verify "$sha"
record verified
activated=0
trap - EXIT INT TERM
