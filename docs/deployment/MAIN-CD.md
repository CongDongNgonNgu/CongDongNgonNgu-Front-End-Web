# Main Production CD

Activation uses the existing transport and reusable workflow. Only a push to main after the required quality job passes can deploy; the exact checked-out SHA must still be current remote main. Existing production Environment SSH secrets are inherited and pinned known_hosts are required. SSH preflight was verified via GitHub Actions on 2026-10-29.

The VPS uses real dist directories, so activation reuses the accepted OAuth runbook's same-filesystem renameat2 exchange instead of converting the live layout to symlinks. Builds/install run only in unique private .releases/SHA-RUN-ATTEMPT directories. No Production .env edit, migration execution, Nginx reload, shared PM2 daemon action, pm2 save or release pruning occurs.

Frontend builds with https://api.congdongngonngu.vn/api/v1. New assets include previous hashed assets. A separate rollback tree retains both asset generations while the exact original tree remains untouched. Public verification checks revision marker, entry scripts/API and canonical www redirect; old unmarked rollback is checked against its captured index digest.

Failures before activation leave the current app intact. Ordinary stop/exchange/start/health failures trigger guarded recovery; unknown inode/runtime drift refuses blind rollback and writes rollback_failed. Source, dependencies, originals, rollback trees and activation-intent.json are retained. They MUST NOT be pruned while referenced. SIGKILL/host crash cannot run shell traps: inspect retained intent/inodes and runtime before an operator recovery; never rerun an uncertain exchange blindly.

Validation includes Bash/ShellCheck, real Linux directory exchanges and injected build/swap/health failures, asset collision/retention and relocated dependency resolution. Application quality gates remain required.
