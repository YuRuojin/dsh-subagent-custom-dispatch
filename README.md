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

### 方式一：Git 仓库（推荐）

在 DSH 侧边栏 **Plugins → Add plugin** 里粘贴仓库地址，国内、国外各一个：

国内（AtomGit，访问更快）：

```
git+ssh://git@atomgit.com/yuruojin/dsh-subagent-custom-dispatch.git
```

国外（GitHub）：

```
git+ssh://git@github.com/YuRuojin/dsh-subagent-custom-dispatch.git
```

SSH 地址要求本机已配置对应平台的 SSH key；没有配置的话改用 HTTPS：

```
git+https://atomgit.com/yuruojin/dsh-subagent-custom-dispatch.git
git+https://github.com/YuRuojin/dsh-subagent-custom-dispatch.git
```

### 方式二：本地目录

把本目录放到本机，在 **Plugins → Add plugin** 里填它的绝对路径。

### 方式三：npm

发布到 npm 后，在 **Plugins → Add plugin** 里填包名。

安装完成后回到 **Plugins** 页启用本插件。

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

## 开发

- `index.js`：Host 半，注册工具与系统提示词段落。
- `client.js`：Plugins 页配置卡片。
- `cordis.patch.yml`：默认身份配置。
- `locale/*.json`：插件显示名与描述。
- `icon.jpg`：图标（512×512，上限 256 KiB）。

依赖：`@deepseek-ai/schemastery`（随包安装）。

## 许可与致谢

- **代码**：MIT，可自由使用、修改、分发，保留版权声明即可。
- **图标**：大肥鱼二创偶像形象，基于 **上善无形**、**ZipZipPipe** 的形象创作；依 **CC BY-NC-SA 4.0** 开源，**禁止商业使用**；转载或再创作需以相同协议授权。
