# dsh-subagent-custom-dispatch

<img src="icon.jpg" alt="插件图标" width="120" height="120" />

[中文](README.md) | [English](README.en.md)

**给 DSH 加一套“按身份派单”的规则：主模型按任务挑身份，每个身份固定用自己的模型和提示词。**

内置的 `subagent` 能力是“叫一个通用子智能体干活”；这个插件再往前一步——你定义几个身份（比如「后端与架构」「代码审查」），每个身份绑定一个模型、一段给子智能体看的提示词、一句给主模型看的派单规则。之后主模型只需要决定“这个任务该找谁”，不用每次重写角色设定，也能在同一轮对话里同时用上不同来源的模型。

---

## 为什么用它

- **一个工具，多个身份**：主模型只看到 `dispatch_subagent(agent, task)`，身份列表由你的配置生成。
- **主模型看得见“派给谁”**：每个身份的派单规则会拼进系统提示词，主模型据此选人。
- **子智能体提示词不外泄**：角色提示词只在派单时附加给子智能体，不占用主模型上下文，也不需要主模型复述。
- **不同模型协同**：一轮对话里可以让「写作」用 A 模型、「后端」用 B 模型、「审查」用 C 模型。
- **配置即改即生效**：模型、名称、规则、提示词保存后立即生效，不必重载插件（增删身份需要重载一次）。
- **跟随官方模型白名单**：只显示并使用官方 `Subagent → Model selection` 里勾选过的模型。

## 安装

在 DSH 侧边栏 **Plugins → Add plugin** 里粘贴下面任意一行即可，不用 `git clone`，也不用配置 SSH key：

国内（GitCode，推荐；与 AtomGit 是同一仓库，二选一即可）：

```
git+https://gitcode.com/yuruojin/dsh-subagent-custom-dispatch.git
git+https://atomgit.com/yuruojin/dsh-subagent-custom-dispatch.git
```

GitHub：

```
https://github.com/YuRuojin/dsh-subagent-custom-dispatch
```

`git+https://` 是 pnpm 的 Git 协议写法，DSH 会把输入交给 pnpm 处理。GitCode 和 AtomGit 都不在 pnpm 的托管 Git 平台列表里，必须带这个前缀；只写 `https://gitcode.com/...` 或 `https://atomgit.com/...` 会被当成压缩包下载并报 gzip 解码失败。GitHub 地址可以直接用普通 https 链接，能否连通取决于网络。

已配置 SSH key 的话也可以换成 `git+ssh://...`；没配置会报 `Permission denied (publickey)`，这不是 DSH 版本问题。

### 安装源（Add plugin 右上角）

在 **Plugins → Add plugin** 里展开 **插件安装引导和示例**，右上角的 **安装源** 决定 npm 包和依赖从哪里下载：

| 选项 | 什么时候用 |
|---|---|
| 第一项（显示本机 pnpm 配置的源，例如 `repo.huaweicloud.com`） | 本机已配置可用镜像，且插件包/依赖在该源上存在 |
| 中国大陆镜像源 `registry.npmmirror.com` | 按 npm 包名安装、国内加速；刚发布的包可能要等镜像同步 |
| 自定义地址 | 指定 npm 官方源 `https://registry.npmjs.org/`，或内网/私有源；需要登录的源把凭据放在本机 `~/.npmrc` |

两点容易误会：

- GitCode / GitHub 的仓库本身直接从 Git 主机克隆，不经过这个安装源；但插件的 npm 依赖（`@deepseek-ai/schemastery`）仍从安装源下载，所以 Git 安装也可能因为源里缺依赖而失败。
- 按包名安装时，如果提示 `not-found` 或没有匹配版本，先换安装源，或等镜像同步；Git 安装不受新包同步延迟影响。

当前这版界面没有单独的“npm 官方源”选项；要用官方源，选 **自定义地址** 并填 `https://registry.npmjs.org/`。

### 本地目录

把本目录放到本机，在 **Plugins → Add plugin** 里填它的绝对路径。

### npm 包名

发布到 npm 后，可以直接在 **Plugins → Add plugin** 里填包名或 `包名@版本`。目前尚未发布，先用上面的 Git 或本地目录方式。

安装完成后回到 **Plugins** 页启用本插件。

### 版本兼容性

本插件没有声明 `engines.dsh`，也没有声明 `@deepseek-ai/dsh*` 的 `peerDependencies`，所以 DSH 不会按版本号拒绝安装它。DSH 的“不兼容”提示只对声明了这两类字段的插件出现；如果安装失败，请展开安装详情看 pnpm 的原始输出——通常是网络、SSH key 或 Git 地址格式的问题。

## 首次配置（两步）

### 1. 在官方页面勾选模型

**Plugins → Subagent → Model selection**：打开开关，勾选你允许子智能体使用的模型。插件只认这份名单。

### 2. 在本插件里给身份选模型

**Plugins → 本插件 → 行 `subagent-dispatch` → Configure**。每个身份一张卡片：

| 填什么 | 谁会看到 | 说明 |
|---|---|---|
| 身份名称 | 主模型 | 派单列表里的称呼，比如「后端与架构」 |
| 固定模型 | 配置层 | 从已勾选的模型里选；决定这个身份用哪个模型 |
| 推理强度 | 配置层 | 可选，留空用模型默认 |
| 派单规则 | 主模型 | 什么任务该派给它 |
| 子智能体提示词 | 只有子智能体 | 派单时附在任务前，主模型看不到 |

配置页右上角有 **刷新**：重新读取官方勾选与模型目录。保存后立即生效。

## 怎么用

配置好之后，主模型会在系统提示词里看到类似这样的列表：

```
- 后端与架构（backend_arch · provider/model）：后端服务、架构设计……时使用
```

需要子智能体时，它会调用：

```
dispatch_subagent(agent: "backend_arch", task: "……完整任务……")
```

插件用官方子智能体运行时（进程内 `spawn`）拉起子会话，附上该身份的子智能体提示词，完成后把结果以完成通知返回。

## 工作原理（简述）

- 只注册 **一个** 工具 `dispatch_subagent`，身份从配置实时读取。
- 身份、模型、规则、提示词都是 **volatile** 配置：设置表单直接改，插件每轮读取最新值。
- 主模型可见的列表 **由每个身份自己的派单规则拼成**，没有单独的“全局规则”字段。
- 身份可用需要两个条件：provider 已在本 profile 注册、路由已在官方模型勾选里。缺一个就不会出现在列表里。
- 子智能体执行走官方 `ctx.subagents`（`spawn` 后端），本插件不实现子代理运行时。

## 常见问题

**Q：配置页没有 Configure？**
A：先确认插件已启用；页面需刷新一次；若行被禁用则先启用。

**Q：配置页显示“未启用/未勾选”？**
A：去 **Plugins → Subagent → Model selection** 打开并勾选模型；回来点“刷新”。

**Q：模型下拉里没有我的模型？**
A：先在第 1 步勾选；插件不会列出未勾选的模型。

**Q：改了没反应？**
A：模型/名称/规则/提示词保存即生效；**增删身份**需要关掉再打开一次插件，让工具的身份集合重新注册。

**Q：输入包名提示未找到 / 没有匹配版本？**
A：安装源里还没有这个包或版本。换 **中国大陆镜像源**，或在 **自定义地址** 里填 npm 官方源 `https://registry.npmjs.org/`；也可以等镜像同步。Git 安装不受新包同步延迟影响。

**Q：Add plugin 一直安装失败？**
A：打开安装详情看最后几行 pnpm 输出：

- `Permission denied (publickey)`：用了 SSH 地址但本机没有对应 key，换成上面的 https 地址。
- `ERR_PNPM_TARBALL_DECODE_GZIP`：GitCode/AtomGit 地址少了 `git+` 前缀，被当成压缩包。
- `Could not connect to server` / `ETIMEDOUT` / `Failed to connect`：网络到不了该 Git 主机，改用 GitCode/AtomGit 或 npm 包名。
- `incompatible-version`：才是 DSH 的版本检查；本插件没有声明版本要求，正常不会出现。

## 开发

- `index.js`：Host 半，注册工具与系统提示词段落。
- `client.js`：Plugins 页配置卡片。
- `cordis.patch.yml`：默认身份配置。
- `locale/*.json`：插件显示名与描述。
- `icon.jpg`：图标（512×512，上限 256 KiB）。

依赖：`@deepseek-ai/schemastery`（随包安装）。

### 发布到 npm

包名 `dsh-subagent-custom-dispatch` 目前在 npm 上可用。发布前确认当前目录就是本插件的仓库副本，且 `package.json` 里没有 `"private": true`：

```sh
npm login --registry=https://registry.npmjs.org/
npm pack --dry-run   # 检查 files 是否覆盖 index.js、client.js、cordis.patch.yml、locale、icon
npm publish --registry=https://registry.npmjs.org/
```

显式写 `--registry` 是因为本机 npm 常配置了国内镜像（华为云、npmmirror 等），不写会发到镜像而不是 npm 官方源。发布后 `npm view dsh-subagent-custom-dispatch version --registry=https://registry.npmjs.org/` 能看到版本，DSH 的 **Add plugin** 就可以直接填包名。升级时改 `version` 再发布。如果包名已被占用，改用带 scope 的名字（如 `@<npm账号>/dsh-subagent-custom-dispatch`），发布时加 `--access public`，安装时填完整的 scoped 名。

安装端还有两个坑：

- DSH 用 pnpm 当前配置的安装源。如果本机 `.npmrc` 指向第三方镜像，在 **Add plugin** 的“安装源”里选 **自定义地址**，填 `https://registry.npmjs.org/`（当前界面没有单独的“npm 官方源”选项）；否则 DSH 只会问那个镜像。镜像通常需要一点时间同步新包。
- pnpm 的 `minimumReleaseAge` 默认 24 小时，刚发布的版本可能不会被自动选中；安装详情会提示实际安装的版本，必要时用 `包名@版本` 指定。

## 许可与致谢

- **代码**：MIT，可自由使用、修改、分发，保留版权声明即可。
- **图标**：大肥鱼二创偶像形象，基于 **上善无形**、**ZipZipPipe** 的形象创作；依 **CC BY-NC-SA 4.0** 开源，**禁止商业使用**；转载或再创作需以相同协议授权。
