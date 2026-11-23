# Dark Factory

The [Copilot cloud agent profiles](.github/agents) take an issue from intake
to a published HTML prototype. Results are committed to a feature branch in this
repository and delivered in one issue-linked pull request. See
[`use-case/`](use-case/README.md) for the directory and preview conventions.

| Agent | Handoff |
| --- | --- |
| Triage | Classifies the issue as new, update, or blocked; selects the path and coordinates delivery. |
| Business Analyst | Turns the issue into business rules, user flows, and numbered acceptance criteria. |
| UX Designer | Designs responsive flows and states; returns verified Figma frames or a clearly labeled wireframe fallback. |
| Product Manager | Sets the smallest useful scope, then decides whether the tested result is ready. |
| Architect | Specifies the files, interactions, technical constraints, and verification approach. |
| Developer | Creates or updates the HTML and design notes in the selected directory. |
| Tester | Checks the actual prototype in the browser and reports evidence against the criteria. |
| Deployment | Verifies the generated Pages catalog before the PR opens. |
| Deployment Publisher | Runs separately after merge and calls the Pages workflow on `main`. |

## Start from an issue on GitHub

Land the profiles on the default branch. Create an issue using the **HTML use
case** form, or describe the same information in a regular issue. For an
update, specify the existing slug. To run without automation, assign the issue
to Copilot on GitHub.com and select **Triage** in the agent picker.

For automatic intake, create **one shared Copilot Automation** from the
repository's **Agents > Automations** page. Automation settings are stored on
GitHub, not loaded from the repository. Use these settings:

| Setting | Value |
| --- | --- |
| Trigger | **When an issue is created**; no title filter, so plain issues also reach Triage. |
| Actors | Require repository write access. Do not enable Copilot-originated triggers. |
| Write scope | **Only this issue** (including resources created during the run). |
| GitHub tools | Read issue, get file, search PRs, add issue comment, commit and push changes, create PR. No merge, issue close, or reviewer assignment tools. |
| Custom agent allowlist | `business-analyst`, `ux`, `product-manager`, `architecture`, `developer`, `tester`, `deployment` (profile stems); configure through the automation tooling that exposes `allowed_custom_agents`. |

Use this automation prompt:

> For the issue that triggered this run, read
> `.github/agents/triage.agent.md` and `use-case/README.md`. Follow Triage's
> instructions as the coordinator. Invoke the named specialist profiles using
> the custom-agent tool and pass their actual outputs to the next stage. Keep
> the working changes in this run and publish only after the required checks.
> If you cannot invoke a required specialist, test the actual changes, or
> publish to this repository with the granted tools, report the blocker.

Before enabling it for routine use, confirm in a smoke run that the cloud
session can invoke the named profiles, share implementation changes with
Tester, and publish one issue-linked PR with the selected tools. If the
automation cannot run the profiles, use the manual Triage entry point rather
than allowing it to skip the specialists.

Review is optional per issue. Selecting **Pause for maintainer approval** stops
after scope and draft design, before implementation or any Figma write. To
resume, have a maintainer start Triage on that same issue and explicitly
approve the recorded scope and, if applicable, Figma destination in the
assignment instructions. GitHub branch rules and required PR reviews still
apply; this workflow never merges.

## Publish to GitHub Pages

In **Settings > Pages > Build and deployment**, set **Source** to
**GitHub Actions**. If Pages is unavailable, check that the repository owner's
plan supports Pages for private repositories and that GitHub Actions is
enabled. Check site visibility before publishing: a private repository does
not automatically make its Pages site private.

### Enable agent-triggered deployment

1. Make a fine-grained GitHub personal access token for **only this repository**
   with **Actions: Read and write** and an expiration date. In the repository,
   open **Settings > Secrets and variables > Agents** and save
   `COPILOT_MCP_PAGES_ACTIONS_AUTH` with the value `Bearer ` followed by the
   token. Never paste the token into a prompt or commit it.
2. In **Settings > Copilot > MCP servers**, add `pages-actions` to the existing
   `mcpServers` object. Do not replace other MCP entries.

   ```json
   {
     "mcpServers": {
       "pages-actions": {
         "type": "http",
         "url": "https://api.githubcopilot.com/mcp/",
         "headers": {
           "Authorization": "$COPILOT_MCP_PAGES_ACTIONS_AUTH",
           "X-MCP-Toolsets": "actions"
         },
         "tools": ["actions_run_trigger"]
       }
     }
   }
   ```

3. Under **Agents > Automations**, create a **shared** automation named
   **Deploy merged use cases**. Use **When a pull request is merged**, query
   `base:main`, and path filters `use-case/**`, `.github/workflows/pages.yml`,
   `scripts/build_pages.py`, and `scripts/pages-index.html`. Require write
   access and leave Copilot-originated triggers off. Grant **Read PR**,
   **List workflows** (for run history), and the `pages-actions` tool
   `actions_run_trigger`. Use this prompt:

   > Read `.github/agents/deployment-publisher.agent.md` and follow it for
   > the pull request that triggered this run. Verify the merge and changed
   > paths, dispatch `pages.yml` on `main` once, and record the workflow link
   > or the reason it was not dispatched.

The Actions tool also supports other operations. Grant it only to the
post-merge automation, not issue intake, and keep the token repository-scoped.
The original Deployment agent checks the artifact before merge but has no
dispatch tool. For the first deployment or a direct-to-`main` change, use
**Actions > Deploy use cases to Pages > Run workflow** on `main`. The site URL
appears on the workflow run and in **Settings > Pages**. The site opens at a
generated `index.html` listing each use case.

## Connect Figma

[Figma's official MCP server](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
supports editable designs via [`use_figma`](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/#use_figma).

1. For an **interactive GitHub.com session**, open
   [Copilot customization](https://github.com/copilot/customize), find
   **Figma** among the connectors, and connect your Figma account. Start a
   supported cloud sandbox session and verify it exposes `use_figma` with
   write access to a designated test Design file. If the connector appears
   under a different name than `figma`, use the UX profile's instructions
   manually in that connected session.
2. For **automatic issue runs**, open the repository's **Settings > Copilot >
   MCP servers** (under **Code, planning, and automation**). This is where
   a repository administrator can add a cloud-compatible MCP integration.
   After configuring it, edit the automation under **Agents > Automations**
   and grant the UX tools from that server explicitly.

GitHub's [repository MCP configuration](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers)
does not support remote OAuth sign-in, and [managed connectors](https://docs.github.com/en/copilot/concepts/customizations/copilot-connectors)
are not available in Actions-backed sessions. Do not add the official server
URL to repository MCP settings and expect issue-driven runs to sign in. For
unattended Figma creation, an administrator needs an approved, noninteractive
MCP integration that actually exposes Figma write tools. Configure it as
`figma` in GitHub's MCP settings, grant only the three tools listed by UX,
and supply a designated Design file through maintainer-controlled
configuration. Do not put credentials in the repo or use issue links as
authorization to write to a file.

Until then, an automatic run produces annotated desktop and mobile wireframes
in `design.md`. If the issue opts into **Require a verified Figma design**,
the run stops instead. For a Figma-required issue, a maintainer can use UX in
a connected client and pass the verified node link and design evidence back
to Triage when starting the issue again.

GitHub references: [custom agent syntax](https://docs.github.com/en/copilot/reference/custom-agents-configuration),
[creating custom agents](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents),
and [creating automations](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/create-automations).
