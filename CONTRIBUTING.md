<p><strong>English</strong> · <a href="CONTRIBUTING.es.md">Español</a></p>

# Contributing

Thank you for helping to make Trueke better! This guide explains how we work.

## Before you start

- For bugs and small improvements, open a pull request directly.
- For something big (a new screen, a model change, a new dependency), open an issue first so we can talk about it.
- Set up the project with [`docs/installation.md`](docs/installation.md) and read [`docs/architecture.md`](docs/architecture.md).

## Branches (git flow)

- `main`: released versions. It only gets merges from `release/*` and `hotfix/*`, with a `vX.Y.Z` tag.
- `develop`: integration.
- Your work goes in `feature/<name>` (or `fix/<name>`), created from `develop`. Open the pull request against `develop`.

## Before you open the pull request

```sh
make lint     # ruff, oxlint, oxfmt, TypeScript
make test     # pytest and Vitest
make e2e      # if you changed a flow from start to end
```

CI runs all of that. It also checks that:

- no migrations are missing (`makemigrations --check`);
- the frontend types match the API (run `make api` and commit `frontend/src/api/`);
- the backend translations are up to date and complete (run `make messages`, needs gettext).

## Guidelines

- **Tests with every change.** Backend: pytest in `apps/<app>/tests/`. Frontend: Vitest next to the code (`*.test.tsx`). A new permission or a new transition comes with a test of who can and who can't.
- **Listing status** changes only through `apps/listings/transitions.py`. Never write `listing.status = …` anywhere else.
- **Frontend**:
  - Server data lives in TanStack Query, not in `useState` or effects.
  - Use a `useEffect` only to sync with something outside React (DOM, WebSocket, timers).
  - The linter checks this, and `src/test/renders.test.tsx` catches extra renders.
- **Visible text**:
  - Frontend: always through i18n (`src/i18n/locales/en.json` and `es.json`).
  - Backend: with `gettext`, then `make messages` and the English translation in `backend/locale/en`.
- **Documentation**: the English version is the main one. If you change a doc, update the Spanish copy too (`docs/es/`, `README.es.md`, `CONTRIBUTING.es.md`), or say in the pull request that it is missing.
- **Accessibility**:
  - Every field has a label.
  - Icon-only buttons have an `aria-label`.
  - Nothing works only with a mouse.
- **Brand**: colors, fonts and components come from the design system (`frontend/src/components/ui`, catalog at `/dev/ui`). No one-off colors.
- **Comments** explain why, not what.

## Commit messages

A short title, like `Chat: mark as read on open`. If needed, add a paragraph that explains why.

## License

By contributing, you agree that your work is published under the project's [MIT](LICENSE) license.
