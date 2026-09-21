# Copilot AI Credit Lab

A browser-based, guided customer demo of the six levers in the [GitHub Copilot token optimization playbook](https://aka.ms/ghcp-tkn-opt).

The lab pairs a VS Code-style workspace powered by Monaco with a Copilot CLI-style terminal powered by xterm. Both surfaces share task files, optimization settings, and reference patches. A live inspector estimates GitHub AI Credit (AIC) usage; completed runs can be compared and exported.

**This is an educational replica, not the actual VS Code or Copilot CLI.** No credentials, model API, backend, or shell access are needed. Responses and AIC estimates are deterministic fixtures, not measured usage, benchmarks, billing quotes, or savings guarantees.

## Run Locally

Use Node.js 24 LTS and npm. Node's built-in TypeScript support is used by the unit tests.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open the URL printed by Vite, normally <http://127.0.0.1:5173/>. Use another port if 5173 is occupied. No environment variables or secrets are required.

## Customer Demo

1. Select **Fix a checkout regression** and start **Guided tour**. Starting the tour resets the current demo, including prior runs.
2. Run the baseline with all six levers disabled. The quick lab presents an **Observe**, **Do**, and **Verify** instruction for every step.
3. For each lever, first inspect its **Without this lever** state and modeled value. Then perform the exact action and compare the **With this lever** value before continuing.
4. Attach the task files, trim unrelated tools, start a fresh conversation, use lean instructions, select medium effort, and choose Auto. Every comparison is shown in modeled AIC.
5. Run the optimized request. The default checkout lab moves from **23.80 to 3.61 modeled AIC**, approximately **85% fewer AI credits**, using the same supplied reference patch. Editing the prompt changes the estimate.
5. Apply the reference patch and run the editor's reference checks. They recognize the supplied fixture; they do not execute arbitrary edited code.
6. Switch to **Copilot CLI**. Settings and code changes carry over. The CLI guided tour adds a required **Run HydraFusion** task after the six optimization levers. You can also run it directly with `/hydrafusion run`.
7. Open **Run history** to inspect the frozen results. Export the JSON report, including prompts, settings, results, and assumptions.
8. Use **Share configuration** to create a reproducible setup link. Use presenter mode for a larger workspace, or reset to start again.

The task selector also includes an API retry boundary bug and an inclusive free-shipping threshold bug. The guided tour works on either surface. On small screens, the editor and chat are separate panes and the inspector follows the workspace.

## Six Levers

| Lever | Modeled change | Important distinction |
| --- | --- | --- |
| Focus the context | Repository retrieval becomes task-file retrieval | Actual retrieval depends on the agent and task. |
| Trim enabled tools | 28 available schemas become 3 core schemas | Assumes eager schema loading. Deferred loading can reduce or eliminate this difference; permissions are separate from availability. |
| Refresh the session | 18,400 history tokens become zero, or a 1,200-token compacted summary | Clear for a new task; compact for ongoing work. Compaction overhead is excluded. |
| Keep instructions lean | 3,200 instruction tokens become 480 | The full instructions shown are an excerpt representing a larger fixture. Shorter instructions do not guarantee a cache hit. |
| Right-size reasoning | Illustrative reasoning budget becomes 1,000 instead of 4,200 output tokens | Not exposed model reasoning or a quality guarantee; model support varies. |
| Let Auto route | Illustrative blended AIC rate is 10% lower | Actual model selection and AIC pricing vary for each request. |

The optional warm-cache assumption prices the 480-token stable instruction prefix at the published Claude Sonnet 4.6 cached-input rate. Cached tokens remain in the internal input total. Real caching depends on prefix matching, provider thresholds, lifetime, eligibility, and pricing.

The accounting in [src/simulation.ts](src/simulation.ts) is explicit:

```text
input = system + instructions + tool schemas + history + files + prompt
prompt = max(1, ceil(character count / 4))
output = 650 reference-answer tokens + illustrative reasoning budget
USD = ((input - cached) * $3 + cached * $0.30 + output * $15) / 1,000,000
AIC = USD / $0.01 * (Auto ? illustrative 0.9 blended-rate factor : 1)
```

The rates are the published Claude Sonnet 4.6 prices per million tokens, and GitHub defines `1 AIC = $0.01 USD`. The Auto factor is an explicit teaching assumption because the routed model can vary. Scenarios intentionally return the same reference result in both configurations; this does not establish real-world quality equivalence. The **View assumptions** dialog and exported report contain these limitations.

## CLI Subset

This demo follows the standalone `copilot` experience, not the retired `gh copilot` extension. It does not execute terminal commands.

| Input | Demo behavior |
| --- | --- |
| `copilot`, `/help` | Session-ready message or supported command list |
| `/context`, `/usage` | Current modeled context or usage |
| `/clear`, `/new` | New conversation with cleared history |
| `/compact` | Retain the compacted-history fixture |
| `/model` | Model and effort picker |
| `/model auto`, `/model claude-sonnet-4.6` | Select a demo routing option |
| `/mcp`, `/mcp list` | Tool settings or available tool groups |
| `/mcp disable enterprise-integrations` | Disable the fictional group of 25 unrelated tools |
| `/mcp enable enterprise-integrations` | Restore that fictional tool group |
| `/instructions` | Inspect and shorten the instruction fixture |
| `/diff` | Inspect the applied reference change |
| `/hydrafusion run` | Simulate coordinator, explorer, implementer, and verifier stages, then save an optimized run |
| `/hydrafusion status` | Show the latest simulated workflow result and AIC estimate |
| A task with `@src/cart.ts` (or the current scenario file) | Use focused context and run the selected scenario fixture |

The HydraFusion flow is an educational orchestration fixture built on the same deterministic scenario engine. It does not invoke live agents, external tools, or a HydraFusion service. Arrow keys recall entered commands; Tab completes a suggested slash command. Ctrl+L clears the displayed command history, not the modeled conversation. Other prompts run the selected scenario fixture: custom text affects prompt size, not the answer. Unknown slash commands are rejected explicitly. Real CLI commands, supported models, effort levels, and policies can vary by version and plan; consult the [official command reference](https://docs.github.com/en/copilot/reference/cli-command-reference).

## Verification

```sh
npm test
npm run lint
npm run build
npm audit
npx playwright install chromium
npm run test:browser
```

- [tests/simulation.test.mjs](tests/simulation.test.mjs) checks accounting, all 64 lever combinations, caching, Auto, history modes, and inert command parsing.
- [tests/browser.spec.ts](tests/browser.spec.ts) covers the full tour, report downloads, all three reference patches, CLI workflows, sharing, editor state, reset, dialog focus, and accessibility.
- Browser checks use Chromium at 320, 768, 1024, and 1440 pixels, axe WCAG A/AA rules, document overflow checks, and terminal-grid bounds. Screenshots are written under `test-results`; failures retain traces. Automated accessibility checks do not replace a full assistive-technology audit.
- [playwright.config.ts](playwright.config.ts) starts or reuses the local app on port 5173. In CI, leave that port free and install Chromium with its required OS dependencies.

## Publish the Web App

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Deploy the generated `dist` directory to an HTTPS static host. No server application or API keys are needed. Keep all generated assets, including the Monaco workers and local fonts, together. Vite preview is a local build check, not a production server.

For hosting under a subpath, build with the matching base, for example:

```sh
npm run build -- --base=/token-lab/
```

The app uses query parameters, not client-side route paths. A share link on localhost only works on the same machine; customer-accessible links require a publicly reachable hosted URL. No public deployment is included in this workspace.

## Data and Sources

Demo state lives in browser memory and is lost on reload unless its configuration is in the URL. Share links contain only scenario, surface, lever, cache, and session selections, not edited code, prompts, or run history. Exported reports include the entered prompts, so use synthetic examples and review reports before sharing. The application makes no live AI requests and includes no analytics or repository uploads.

- [Optimization playbook](https://aka.ms/ghcp-tkn-opt): the teaching concepts, not a measured savings baseline.
- [GitHub Copilot CLI documentation](https://docs.github.com/en/copilot/reference/cli-command-reference): real command reference.
- [VS Code image source](https://github.com/microsoft/vscode/blob/main/resources/linux/code.png): local identifier used for the replica workspace.
- Monaco, xterm, Lucide icons, DM Sans, and JetBrains Mono are bundled through their respective packages. Product names and imagery identify the experiences being simulated; this demo is not an official product client or an endorsement claim.
