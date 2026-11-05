Read `README.md` before you proceed.

## Changelog

Add anything a user of the library would notice — a new component or option, changed behaviour, a fix, a removal — to `CHANGELOG.md`, under the version being prepared. Usually a single short sentence each in plain, brief language. High-level, leave out details. Mark **breaking** changes. When adding to a release, see if it makes sense to merge your changes into an existing item, instead of adding one. Don't mention refactors, internals and tests at all.

## Releases and deploying

The version being prepared is the top entry of `CHANGELOG.md`; `version` in `package.json` is bumped to it by the release commit. Deploying is a manual `npm publish` by the user; its postpublish script points `refs/tps/deployed` at the commit published, for TPS to show what is deployed. TPS's check (`tps.check` in `Containerfile.dev`) is `npm ci && npm run build && npm test`: the tests load the demo from `dist/`.

## Commit messages

One short line. Prefix a release commit with its version: `v0.9.0: Panel navigation improvements`.

## Before merge/done

Run `npm run build` and the full test suite `npm test`, and if there are visual changes ask the user to review and accept them with `npx shotest review`, before declaring done. When running in TPS (you'll know if that's the case): use `/tps/bin/tps-guest-tool` to run these services from `Containerfile.dev`: `check` (the check above), `test` (`npm test`, against the current `dist/`), `review` (`npx shotest review --close-on-accept`; when you want the user to review and accept visual changes; it exits when/if the user has accepted), `app` (builds and serves the demo; when you want the user to look at it).
