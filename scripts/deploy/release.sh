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
test "$(realpath "$base")" = "$base"
test "$(cat .source-sha)" = "$sha"
test "$(node -p 'process.versions.node.split(".")[0]')" = 24
exec 9> "$base/.deploy.lock"
flock -n 9 || { echo 'Application deployment is already running' >&2; exit 1; }
test -d "$base/dist" && test ! -L "$base/dist"
candidate="$base/.cdnn-next-$sha-$run"
rollback="$base/.cdnn-rollback-$sha-$run"
test ! -e "$candidate" && test ! -L "$candidate"
test ! -e "$rollback" && test ! -L "$rollback"
node scripts/deploy/release-assets.cjs reserve "$base"
npm ci --include=dev
VITE_API_BASE_URL=https://api.congdongngonngu.vn/api/v1 npm run build
npm audit --omit=dev --audit-level=moderate
node scripts/deploy/verify.cjs artifact
node scripts/deploy/release-assets.cjs space "$base" "$base/dist" "$release/dist"
printf '{"sha":"%s"}\n' "$sha" > dist/cdnn-release.json
node scripts/deploy/release-assets.cjs assets "$base/dist/assets" "$release/dist/assets"
# Retain an exact original and a separate rollback union for clients that saw new hashes.
cp -a "$base/dist" "$rollback"
node scripts/deploy/release-assets.cjs assets "$release/dist/assets" "$rollback/assets"
previous_index=$(node scripts/deploy/release-assets.cjs index-digest "$rollback")
find dist "$rollback" -type d -exec chmod 755 {} +
find dist "$rollback" -type f -exec chmod 644 {} +
mv -T "$release/dist" "$candidate"
mkdir "$release/.exchange-a" "$release/.exchange-b"
python3 scripts/deploy/exchange.py "$release/.exchange-a" "$release/.exchange-b"
python3 scripts/deploy/exchange.py "$release/.exchange-a" "$release/.exchange-b"
rmdir "$release/.exchange-a" "$release/.exchange-b"
old_inode=$(stat -c '%d:%i' "$base/dist")
new_inode=$(stat -c '%d:%i' "$candidate")
rollback_inode=$(stat -c '%d:%i' "$rollback")
verify() {
  for attempt in $(seq 1 12); do
    if node scripts/deploy/verify.cjs "$1"; then return 0; fi
    printf 'Verification retry %s/12\n' "$attempt"
    sleep 5
  done
  return 1
}
record() {
  printf '{"attempted_sha":"%s","result":"%s","retained_original":"%s","rollback":"%s","timestamp":"%s"}\n' "$sha" "$1" "$candidate" "$rollback" "$(date -u +%FT%TZ)" >> "$base/.deployment-ledger.jsonl"
}
recover() {
  local status=$?
  trap - EXIT INT TERM
  local live_inode
  live_inode=$(stat -c '%d:%i' "$base/dist")
  if [[ "$live_inode" == "$old_inode" ]]; then record failed_without_activation
  elif [[ "$live_inode" == "$new_inode" && "$(stat -c '%d:%i' "$candidate")" == "$old_inode" && "$(stat -c '%d:%i' "$rollback")" == "$rollback_inode" ]]; then
    if python3 scripts/deploy/exchange.py "$base/dist" "$rollback" && verify "rollback:$previous_index"; then record rolled_back; else record rollback_failed; fi
  else
    record rollback_failed
    echo 'Unknown release inode pair; operator inspection required' >&2
  fi
  exit "$status"
}
printf '{"sha":"%s","old_inode":"%s","new_inode":"%s","candidate":"%s","rollback_inode":"%s","previous_index":"%s"}\n' "$sha" "$old_inode" "$new_inode" "$candidate" "$rollback_inode" "$previous_index" > "$release/activation-intent.json"
node scripts/deploy/release-assets.cjs sync "$release/activation-intent.json" "$release" "$base"
trap recover EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
python3 scripts/deploy/exchange.py "$base/dist" "$candidate"
test "$(stat -c '%d:%i' "$base/dist")" = "$new_inode"
verify "$sha"
record verified
trap - EXIT INT TERM
