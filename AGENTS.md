Read `README.md` before you proceed.

## Changelog

Add anything a user of the library would notice — a new component or option, changed behaviour, a fix, a removal — to `CHANGELOG.md`, under the version being prepared. Usually a single short sentence each in plain, brief language. High-level, leave out details. Mark **breaking** changes. When adding to a release, see if it makes sense to merge your changes into an existing item, instead of adding one. Don't mention refactors, internals and tests at all.

## Versions, releases and deploying

A user-facing change bumps `version` in `package.json`, semver-style (below 1.0: breaking changes and larger features minor, the rest patch), and gets its item in `CHANGELOG.md` under a heading for that version. A version not on npm yet (`npm view staffa version`) is still pending: fold further changes into it (and its changelog entry) rather than bumping again, so that deploying is all a release takes.

Deploying (TPS's rocket, `tps.deploy` in `Containerfile.dev`) pushes the commit to `origin`'s `main` on GitHub, where `.github/workflows/publish.yml` publishes it to npm through trusted publishing, unless npm has that version already.

## Commit messages

One short line. Prefix a release commit with its version: `v0.9.0: Panel navigation improvements`.

## Tests

The tests (`npx shotest test`, in `tests/`) load the demo from `dist/`: run `npm run build` first. Accepting screenshots into `test-accepted/` is the user's call, in ShoTest's review app; don't accept them yourself. In TPS, work as `.claude/skills/shotest/TPS.md` says under "Working on a task": run the specs your change affects, have the user review them, and leave the whole suite to `tps.test` at merge. `app` (the CMD in `Containerfile.dev`) builds and serves the demo, for when the user is to look at it.
