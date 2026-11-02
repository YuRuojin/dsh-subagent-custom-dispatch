# dsh-subagent-custom-dispatch

<img src="icon.jpg" alt="Plugin icon" width="120" height="120" />

[中文](README.md) | [English](README.en.md)

**Identity-based dispatch rules for DSH: the main model picks an identity, and each identity keeps its own model and prompt.**

DSH's built-in `subagent` is "ask a generic child to do the work". This plugin goes one step further. You define a few identities (for example "Backend & Architecture", "Code Review"); each one binds a model, a brief shown only to the child, and a dispatch rule the main model can read. The main model then only has to decide *who* should take the task — no role prompt rewriting, and different model vendors can work in the same turn.

---

## Why use it

- **One tool, many identities** — the model sees `dispatch_subagent(agent, task)`; the roster comes from your configuration.
- **The main model sees who is available** — each identity's dispatch rule is assembled into the system prompt.
- **Child briefs stay hidden** — role prompts are attached only when dispatching, so they never consume the main model's context.
- **Mix models per task** — writing on model A, backend on model B, review on model C in one conversation.
- **Live configuration** — model, name, rule, and brief apply on save (adding or removing identities needs one reload).
- **Follows the official allowlist** — only models checked in `Subagent → Model selection` are shown and used.

## Install

### Option 1: Git repository (recommended)

Paste a repository address into DSH's **Plugins → Add plugin**. One mirror for China, one for the rest of the world:

China (AtomGit, usually faster):

```
git+ssh://git@atomgit.com/yuruojin/dsh-subagent-custom-dispatch.git
```

International (GitHub):

```
git+ssh://git@github.com/YuRuojin/dsh-subagent-custom-dispatch.git
```

SSH addresses require an SSH key for that platform on this machine. Without one, use HTTPS:

```
git+https://atomgit.com/yuruojin/dsh-subagent-custom-dispatch.git
git+https://github.com/YuRuojin/dsh-subagent-custom-dispatch.git
```

### Option 2: Local directory

Put this directory on the machine and paste its absolute path into **Plugins → Add plugin**.

### Option 3: npm (not published yet)

`dsh-subagent-custom-dispatch` is not published on npm yet (the name is still free), so installing by package name does not work today. Once published, paste the name into **Plugins → Add plugin**; until then use the Git or local-directory options above.

After installing, enable the plugin on the **Plugins** page.

## First-run setup (two steps)

### 1. Check models in the official page

**Plugins → Subagent → Model selection**: enable it and check the models subagents may use. This plugin only accepts that list.

### 2. Give each identity a model here

**Plugins → this plugin → row `subagent-dispatch` → Configure**. One card per identity:

| Field | Who sees it | Meaning |
|---|---|---|
| Identity name | main model | the name in the dispatch list |
| Fixed model | config | chosen from the checked models |
| Reasoning effort | config | optional; model default when empty |
| Dispatch rule | main model | which task belongs to this identity |
| Child brief | child only | prepended to the task; hidden from the main model |

The page has a **Refresh** button that re-reads the official checks and the model catalog. Saves apply immediately.

## Usage

With the setup done, the main model sees a list like:

```
- Backend & Architecture (backend_arch · provider/model): use for backend services, architecture, ….
```

and calls:

```
dispatch_subagent(agent: "backend_arch", task: "…complete task…")
```

The plugin starts the child through the official subagent runtime (in-process `spawn`), attaches the identity's brief, and returns the result as a completion notice.

## How it works

- Exactly **one** tool, `dispatch_subagent`; identities are read live from the plugin configuration.
- Identity, model, rule, and brief are **volatile** fields: the settings form writes them and the plugin reads the latest values every turn.
- The main-model list is **composed from each identity's own rule**; there is no separate global rule field.
- An identity is usable only when its provider is registered in this profile **and** its route is checked in the official model selection.
- Child execution uses official `ctx.subagents` (`spawn`); this plugin does not implement a subagent runtime.

## FAQ

**No Configure button?** Make sure the plugin is enabled, refresh the page, and check the row is not disabled.

**"Not enabled / nothing checked"?** Go to **Plugins → Subagent → Model selection**, enable and check models, then press Refresh here.

**My model is missing from the dropdown?** Check it in step 1 first; unchecked models are not offered.

**Edits do not apply?** Model/name/rule/brief apply on save. **Adding or removing identities** needs a plugin toggle so the tool's identity set is re-registered.

## Development

- `index.js` — Host half: registers the tool and the system-prompt section.
- `client.js` — Plugins-page configuration cards.
- `cordis.patch.yml` — default identities.
- `locale/*.json` — display name and description.
- `icon.jpg` — icon (512×512, max 256 KiB).

Dependency: `@deepseek-ai/schemastery` (installed with the package).

## License and credits

- **Code**: MIT — free to use, modify, and redistribute, provided the copyright notice is kept.
- **Icon**: derivative fan art of the "Da Fei Yu" (大肥鱼) idol character, based on character designs by **上善无形** and **ZipZipPipe**. Released under **CC BY-NC-SA 4.0**; **commercial use is prohibited**; redistribution or derivative works must use the same license.
