### Creche Finance Reports

Custom reporting app for tracking allocated budgets and utilized amounts in creche finance management, with insights into expenses, balances, and financial performance.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app creche_reports
bench migrate
```

Always run `bench migrate` after installing or pulling an update - several
one-time setup steps (AI assistant data policies, its behaviour guide,
sidebar/search defaults) only run as part of migrate, not install-app alone.
A site that's never been migrated after these were added will have the AI
assistant turned on with no data access and a much thinner built-in guide.

### AI Assistant

A floating chat assistant (Settings > App Setting > AI Assistant) that can
answer questions about budgets, disbursements, utilisation and caregiver
salary data, and show tables/charts in the chat. Configuration:

- **Enable AI Assistant** / **Allowed Roles** - turns it on and restricts who
  sees it (empty roles = every logged-in user).
- **API Base URL** / **Model** / **API Key** - any OpenAI-compatible chat
  completions endpoint (defaults to OpenRouter; works with a local Ollama
  too - leave the key blank for providers that don't need one).
- **Daily Message Limit Per User** / **Max Concurrent Assistant Jobs** -
  protect against runaway API costs and keep one site's AI usage from
  starving the shared background worker.
- **Max Rows Per Assistant Request** - ceiling on how many rows a single
  search/list/count can return in one reply (still only ever the rows the
  signed-in user's own role/permissions already allow) - a safety ceiling
  against one reply trying to hold an unexpectedly huge result, not a small
  default meant to be hit routinely.

**Data access**: everything the assistant can see or change goes through
`creche_reports/ai/data_service.py`'s default-deny layer - a doctype is
visible only if it has an enabled **AI Data Policy** (Settings > AI Data
Policy), and personal fields (names, phone numbers, bank details, location)
are never sent to the model - they're replaced with a placeholder the app
resolves back to the real value for the signed-in user after the model
replies. See that module's own docstring for the full layer-by-layer
breakdown.

**Behaviour guide**: the assistant's own instructions (tone, which tool to
use for which kind of question, worked examples) live in **AI Guide
Section** / **AI Guide Instruction** (Settings), editable from the desk with
no redeploy needed - changes take effect on the assistant's next request
(60s cache). `bench migrate` seeds a starter guide
(`creche_reports/ai/seed_guide.py`) on a site that doesn't have one yet,
without ever overwriting an admin's own edits on a site that does.

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/creche_reports
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade
### CI

This app can use GitHub Actions for CI. The following workflows are configured:

- CI: Installs this app and runs unit tests on every push to `develop` branch.
- Linters: Runs [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and [pip-audit](https://pypi.org/project/pip-audit/) on every pull request.


### License

mit
