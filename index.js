/**
 * Identity-based subagent dispatch for DeepSeek Harness.
 *
 * One model-facing tool (`dispatch_subagent`) routes a task to one configured
 * identity. Each identity owns:
 * - `name`  — the identity the main model sees;
 * - `when`  — its dispatch rule, also main-model visible;
 * - `instructions` — the brief sent to the child, never shown to the main model;
 * - `provider`/`model`/`reasoningEffort` — its fixed route.
 *
 * The main-model-visible list is composed from each identity's own `when`; there
 * is no separate global rule field to duplicate.
 *
 * `agents` is a volatile config field, so the Plugins page edits it live.
 * An identity is usable only while its provider is registered and its route is
 * checked in the official Subagent → Model selection.
 *
 * Child execution uses the official subagent runtime (`ctx.subagents` with the
 * in-process `spawn` backend); this plugin only supplies dispatch rules.
 *
 * @module dsh-subagent-custom-dispatch
 */

import z from '@deepseek-ai/schemastery'

export const name = 'subagent-dispatch'

export const inject = ['tools', 'subagents', 'systemPrompt']

export const Config = z.object({
  maxDepth: z.natural().max(Number.MAX_SAFE_INTEGER).default(1),
  agents: z.array(z.object({
    id: z.string().required(),
    name: z.string().required(),
    when: z.string().default(''),
    instructions: z.string().default(''),
    provider: z.string().default(''),
    model: z.string().default(''),
    reasoningEffort: z.string().min(1),
  })).default([]).volatile(),
})

/**
 * Read a volatile config reference.
 * @param value - config field (ref or plain).
 * @returns the current value.
 */
function readRef(value) {
  return value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value
}

/**
 * Read the live identity list.
 * @param config - plugin configuration.
 * @returns the current agents array.
 */
function readAgents(config) {
  const list = readRef(config.agents)
  return Array.isArray(list) ? list : []
}

/**
 * Validate one identity, failing with a message that names it.
 * @param agent - candidate identity.
 */
function assertAgent(agent) {
  if (agent === null || typeof agent !== 'object') throw new Error('subagent-dispatch: every identity must be an object')
  if (typeof agent.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(agent.id)) {
    throw new Error(`subagent-dispatch: identity id "${String(agent.id)}" must match ^[a-z][a-z0-9_]*$`)
  }
  if (typeof agent.name !== 'string' || agent.name.trim().length === 0) {
    throw new Error(`subagent-dispatch: identity "${agent.id}" needs a name`)
  }
  if (typeof agent.provider !== 'string') throw new Error(`subagent-dispatch: identity "${agent.id}" has an invalid provider`)
  if (typeof agent.model !== 'string') throw new Error(`subagent-dispatch: identity "${agent.id}" has an invalid model`)
}

/**
 * Whether one identity carries a complete route.
 * @param agent - configured identity.
 * @returns true when provider and model are both set.
 */
function hasRoute(agent) {
  return typeof agent.provider === 'string' && agent.provider.length > 0 &&
    typeof agent.model === 'string' && agent.model.length > 0
}

/**
 * Render one identity's route.
 * @param agent - configured identity.
 * @returns label such as `aihub/gpt-6.1-sol · effort high`.
 */
function routeLabel(agent) {
  return `${agent.provider}/${agent.model}${agent.reasoningEffort === void 0 ? '' : ` · effort ${agent.reasoningEffort}`}`
}

/**
 * Dispatch policy shown above the identity list.
 *
 * A bare roster only states that identities exist; the main model then keeps
 * doing the work itself. These lines give positive triggers and name the cases
 * that should stay local, which is what actually moves the decision.
 * Edit this constant to make dispatch more or less eager.
 */
const DISPATCH_POLICY = [
  '派单优先级：先看能不能派，再决定自己做还是派。',
  '- 任务能拆成两个以上互不依赖的部分：连续调用多次 `dispatch_subagent`，并行派出去。',
  '- 明显属于下面某个身份的专长：派给它，不要自己从零实现。',
  '- 只需要一个独立第二意见：直接派，不要先自己写一版再自审。',
  '不必派单：一句话就能答完、强依赖本对话上下文、或必须由你亲自执行才能继续的任务；也不要为派单而派单。',
  '如果你是被派来的子智能体（提示词开头写着你的身份职责），直接完成手里的任务，不要再派单。',
].join('\n')

/**
 * Compose the main-model-visible dispatch list from each identity's own rule.
 * @param agents - currently usable identities.
 * @returns the system-prompt section text.
 */
function renderRoster(agents) {
  const header = '## 子智能体派单\n' +
    '需要子智能体时，从下列身份中选一个，调用 `dispatch_subagent`；`agent` 填括号里的 id，task 写全（目标、输入、约束、期望产出）。身份提示词由插件附带，不需要你复述。\n\n' +
    DISPATCH_POLICY
  if (agents.length === 0) {
    return `${header}\n\n（当前没有可用身份：官方 Plugins → Subagent → Model selection 未开启、未勾选对应模型，或 provider 未接入。）`
  }
  const lines = agents.map((agent) => `- **${agent.name}**（\`${agent.id}\` · ${routeLabel(agent)}）：${agent.when.trim() || '（未填写派单规则）'}`).join('\n')
  return `${header}\n\n${lines}`
}

/**
 * Install the dispatch tool and the identity roster.
 * @param ctx - context owning the registrations.
 * @param config - plugin configuration.
 */
export function apply(ctx, config) {
  const initialAgents = readAgents(config)
  const seen = new Set()
  for (const agent of initialAgents) {
    assertAgent(agent)
    if (seen.has(agent.id)) throw new Error(`subagent-dispatch: duplicate identity id "${agent.id}"`)
    seen.add(agent.id)
  }
  if (initialAgents.length === 0) throw new Error('subagent-dispatch: `agents` must be a non-empty array')
  const maxDepth = typeof config.maxDepth === 'number' ? config.maxDepth : 1

  const llm = ctx.get('llm')
  const knownProviders = new Set(llm === undefined ? [] : llm.listProviders().map((provider) => provider.id))

  // Follow the official subagent model allowlist (Plugins → Subagent → Model selection).
  const selection = ctx.get('subagentModelSelection')
  const routeKey = (route) => `${route.provider}\0${route.model}`
  const allowedKeys = () => {
    if (selection === void 0) return new Set()
    let current
    try {
      current = selection.current()
    } catch {
      return new Set()
    }
    return new Set(current.enabled ? current.allowedModels.map(routeKey) : [])
  }
  const usable = (agent) => hasRoute(agent) && knownProviders.has(agent.provider) && allowedKeys().has(routeKey(agent))
  const usableAgents = () => readAgents(config).filter(usable)

  const toolName = 'dispatch_subagent'
  const definition = {
    name: toolName,
    description:
      '把一个自足的任务派给一个具名子智能体，立即返回子任务 id，完成后以完成通知返回结果。' +
      '任务可拆分、可并行、或明显属于某个身份职责时优先派单；要同时派多个就连续调用多次。' +
      '可选身份、各自固定的模型与适用场景见系统提示词「子智能体派单」一节；agent 必须是那一节里的 id，不要自造。' +
      '身份提示词由插件自动带上，task 只需写任务本身。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['agent', 'task'],
      properties: {
        agent: {
          type: 'string',
          description: '身份 id，取系统提示词「子智能体派单」列表里括号中的值。',
        },
        task: {
          type: 'string',
          description: '交给子智能体的完整任务：目标、输入路径或范围、约束、期望产出。子智能体不共享当前对话，必须自足。',
        },
        cwd: {
          type: 'string',
          description: '子智能体的初始工作目录；省略时继承当前目录。',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'subagentId', 'agent', 'name', 'provider', 'model'],
        properties: {
          kind: { type: 'string', const: 'activation' },
          subagentId: { type: 'string' },
          agent: { type: 'string' },
          name: { type: 'string' },
          provider: { type: 'string' },
          model: { type: 'string' },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `started ${value.name} subagent ${value.subagentId} (${value.provider}/${value.model})`,
      }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (parent === void 0) throw new Error(`${toolName} requires a calling agent (exec.agent was undefined)`)
      if (typeof args.task !== 'string' || args.task.trim().length === 0) throw new Error('`task` must be a non-empty string')

      const agents = readAgents(config)
      const agent = agents.find((entry) => entry.id === args.agent)
      if (agent === void 0) {
        const available = usableAgents().map((entry) => `\`${entry.id}\``).join('、') || '（无）'
        throw new Error(`未知身份 "${String(args.agent)}"；当前可用：${available}`)
      }
      assertAgent(agent)
      if (!hasRoute(agent)) {
        throw new Error(`身份 "${agent.id}" 还没有配置模型；到 Plugins → 本插件 → Configure 里选一个模型并保存`)
      }
      if (!knownProviders.has(agent.provider)) throw new Error(`身份 "${agent.id}" 的 provider "${agent.provider}" 未在本 profile 注册`)
      if (!allowedKeys().has(routeKey(agent))) {
        throw new Error(`身份 "${agent.id}" 的路由 ${agent.provider}/${agent.model} 未在官方「Plugins → Subagent → Model selection」中勾选（或该开关已关闭）`)
      }

      const provider = ctx.subagents.getProvider('spawn')
      if (provider === void 0) throw new Error('subagent provider "spawn" is not registered; enable @deepseek-ai/dsh-subagent-spawn-in-process')
      if (!provider.capabilities.agentOptions) throw new Error('subagent provider "spawn" cannot receive a child LLM route')

      const route = {
        provider: agent.provider,
        model: agent.model,
        ...agent.reasoningEffort === void 0 ? {} : { reasoningEffort: agent.reasoningEffort },
      }
      if (llm !== void 0) await llm.resolveCallConfig(route, exec.signal)
      exec.signal.throwIfAborted()

      const brief = typeof agent.instructions === 'string' ? agent.instructions.trim() : ''
      const activation = await ctx.subagents.startActivation({
        provider: 'spawn',
        label: `${agent.name}: ${args.task.trim().slice(0, 48)}`,
        request: {
          ...args.cwd === void 0 ? {} : { cwd: args.cwd },
          prompt: [{ type: 'text', text: brief.length === 0 ? args.task : `${brief}\n\n---\n\n${args.task}` }],
          parent,
          agentOptions: route,
          ...maxDepth === void 0 ? {} : { maxDepth },
        },
        signal: exec.signal,
        delivery: 'parent',
      })

      return {
        kind: 'activation',
        subagentId: activation.childId,
        agent: agent.id,
        name: agent.name,
        provider: agent.provider,
        model: agent.model,
      }
    },
  }
  ctx.effect(() => ctx.tools.register(definition))

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'tool:subagent-dispatch',
    order: ctx.systemPrompt.getSectionOrder('TOOL_SUBAGENT'),
    text: () => renderRoster(usableAgents()),
  }))
}
