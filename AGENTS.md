Read `README.md` before you proceed.

## Changelog

Add anything a user of the library would notice — a new component or option, changed behaviour, a fix, a removal — to `CHANGELOG.md`, under the version being prepared. Usually a single short sentence each in plain, brief language. High-level, leave out details. Mark **breaking** changes. When adding to a release, see if it makes sense to merge your changes into an existing item, instead of adding one. Don't mention refactors, internals and tests at all.

## Commit messages

One short line. Prefix a release commit with its version: `v0.9.0: Panel navigation improvements`.

## Before merge/done

Run the full test suite `npm test` and if there are visual changes ask the user to run `npx run shotest` and accept them, before declaring done. When running in TPS (you'll know if that's the case): use `/tps/bin/tps-service-manager` to run these predefined services: `test` (npm test), `review` (shotest review --close-on-accept; when you want the user to review and accept visual changes; it exits when/if the user has accepted), `app` (the demo; when you want the user to look at the demo app).
