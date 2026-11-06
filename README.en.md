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

Paste either line into DSH's **Plugins → Add plugin**. No `git clone` and no SSH key needed:

China (GitCode, recommended; the same repository as AtomGit, pick either):

```
git+https://gitcode.com/yuruojin/dsh-subagent-custom-dispatch.git
git+https://atomgit.com/yuruojin/dsh-subagent-custom-dispatch.git
```

International (GitHub):

```
https://github.com/YuRuojin/dsh-subagent-custom-dispatch
```

`git+https://` is pnpm's Git protocol form; DSH hands the input to pnpm. Neither GitCode nor AtomGit is one of pnpm's recognized hosted Git platforms, so the prefix is required — a bare `https://gitcode.com/...` or `https://atomgit.com/...` URL is downloaded as a tarball and fails with a gzip error. The GitHub URL works as a plain https link, subject to network reachability.

If this machine already has an SSH key for that host, `git+ssh://...` also works; without one it fails with `Permission denied (publickey)`, which is not a DSH version issue.

### Install source (top right of Add plugin)

In **Plugins → Add plugin**, expand the install guide; the **Install source** selector at its top right decides where npm packages and their dependencies are downloaded (shown as `安装源` in the Chinese UI):

| Option | When to use it |
|---|---|
| First entry (pnpm's configured registry, e.g. `repo.huaweicloud.com`) | A usable mirror is configured on this machine and the plugin/dependencies exist there |
| China mainland mirror `registry.npmmirror.com` | Install by npm name with faster access in China; a brand-new release may need time to sync |
| Custom address | npm's official registry `https://registry.npmjs.org/`, or an internal/private registry; put credentials in this machine's `~/.npmrc` |

Two points that surprise people:

- The GitCode / GitHub repository itself is cloned directly from the Git host, not through this source; but the plugin's npm dependency (`@deepseek-ai/schemastery`) still comes from that source, so a Git install can fail when the source lacks a dependency.
- For install-by-name, `not-found` or no matching version usually means the selected source has not synced the package/version yet; switch sources or wait. Git installs do not wait for mirror sync.

The current dialog has no separate "npm official" entry; choose **Custom address** and enter `https://registry.npmjs.org/`.

### Local directory

Put this directory on the machine and paste its absolute path into **Plugins → Add plugin**.

### npm package name

Once published, paste the bare package name (or `name@version`) into **Plugins → Add plugin**. It is not published yet; use the Git or local-directory form above for now.

After installing, enable the plugin on the **Plugins** page.

### Version compatibility

This plugin declares neither `engines.dsh` nor any `@deepseek-ai/dsh*` `peerDependencies`, so DSH never refuses it based on the DSH version. DSH's "incompatible" rejection only applies to plugins that declare those fields; when an install fails here, open the install details and read the raw pnpm output — it is normally network, SSH-key, or Git-URL formatting.

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

**Install by name says not found / no matching version?** The selected install source has not synced the package or version yet. Switch to the China mainland mirror or **Custom address** with npm's official registry, or wait for sync; Git installs do not wait for mirror sync.

**Add plugin keeps failing?** Open the install details and read the last pnpm lines:

- `Permission denied (publickey)`: an SSH address is used without a key on this machine; switch to the https line above.
- `ERR_PNPM_TARBALL_DECODE_GZIP`: the GitCode/AtomGit address is missing the `git+` prefix and was fetched as a tarball.
- `Could not connect to server` / `ETIMEDOUT` / `Failed to connect`: the network cannot reach that Git host; use GitCode/AtomGit or the npm name.
- `incompatible-version`: this is DSH's version check; this plugin declares no version requirement, so it should not appear.

## Development

- `index.js` — Host half: registers the tool and the system-prompt section.
- `client.js` — Plugins-page configuration cards.
- `cordis.patch.yml` — default identities.
- `locale/*.json` — display name and description.
- `icon.jpg` — icon (512×512, max 256 KiB).

Dependency: `@deepseek-ai/schemastery` (installed with the package).

### Publishing to npm

The name `dsh-subagent-custom-dispatch` is currently free on npm. Publish from the plugin's repository copy, and make sure `package.json` has no `"private": true`:

```sh
npm login --registry=https://registry.npmjs.org/
npm pack --dry-run   # confirm files covers index.js, client.js, cordis.patch.yml, locale, icon
npm publish --registry=https://registry.npmjs.org/
```

The explicit `--registry` matters because a local npm setup often points at a China mirror (Huawei Cloud, npmmirror, …); without it the publish goes to the mirror, not npm. Afterwards `npm view dsh-subagent-custom-dispatch version --registry=https://registry.npmjs.org/` shows the release, and **Add plugin** accepts the bare package name. Bump `version` to publish an update. If the name is taken, use a scope (for example `@<npm-user>/dsh-subagent-custom-dispatch`), publish with `--access public`, and install with the full scoped name.

Two consumer-side pitfalls:

- DSH installs from pnpm's configured registry. If this machine's `.npmrc` points at a third-party mirror, choose **Custom address** in the **Add plugin** install-source selector and enter `https://registry.npmjs.org/` (there is no separate "npm official" entry in the current dialog); otherwise DSH asks only that mirror, which needs time to sync a new package.
- pnpm's `minimumReleaseAge` defaults to 24 hours, so a just-published version may not be selected automatically; the install details name the installed version, and `name@version` pins the intended one.

## License and credits

- **Code**: MIT — free to use, modify, and redistribute, provided the copyright notice is kept.
- **Icon**: derivative fan art of the "Da Fei Yu" (大肥鱼) idol character, based on character designs by **上善无形** and **ZipZipPipe**. Released under **CC BY-NC-SA 4.0**; **commercial use is prohibited**; redistribution or derivative works must use the same license.
