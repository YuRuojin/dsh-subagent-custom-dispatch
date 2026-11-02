/**
 * Plugins-page configuration for dsh-subagent-custom-dispatch.
 *
 * One card per identity: the name the main model sees, its dispatch rule (also
 * main-model visible), the brief sent to the child (not shown to the main
 * model), and the fixed model route. The visible identities and route options
 * follow the official Plugins -> Subagent -> Model selection allowlist.
 */
window.__ModuleLoader__.load({
  id: 'dsh-subagent-custom-dispatch',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'subagentDispatch'

    const zh = {
      title: '子智能体派单',
      summary: '按身份派发子智能体：每个身份固定一个模型，并带有主模型可见的派单规则与子智能体提示词。',
      hint: '身份名称与派单规则会进入主模型的系统提示词；子智能体提示词只在派单时附给子 agent，主模型看不到。保存即生效。',
      identities: '个身份',
      identityName: '身份名称（主模型可见）',
      identityNameHint: '主模型在派单列表里看到的称呼，例如「后端与架构」。',
      when: '派单规则（主模型可见）',
      whenHint: '写清什么任务该派给这个身份。',
      prompt: '子智能体提示词（主模型不可见）',
      promptHint: '派单时附在任务开头；子智能体不共享当前对话，提示词要自足。',
      route: '固定模型',
      chooseModel: '选择模型…',
      unconfigured: '未配置模型',
      effort: '推理强度',
      effortDefault: '模型默认',
      save: '保存',
      saving: '保存中…',
      failed: '保存未通过：Host 拒绝了这次修改，草稿已保留。',
      unavailable: '该行当前不可配置（配置文档未提供）。',
      catalogFailed: '模型目录读取失败，仍保留已保存的路由。',
      noAgents: '还没有配置任何身份。',
      noMatchingAgents: '已勾选的模型没有对应身份；把某个身份的模型改成已勾选的路由即可。',
      selectionLoading: '正在读取官方「Subagent → Model selection」…',
      selectionUnavailable: '暂时读不到官方「Subagent → Model selection」，先显示全部身份；读到后会按勾选过滤。',
      selectionError: '读取官方「Subagent → Model selection」失败；可以点「刷新」重试，当前先显示全部身份。',
      refresh: '刷新',
      refreshing: '刷新中…',
      refreshHint: '重新读取官方模型勾选与模型目录',
      synced: '已同步勾选模型：',
      selectionOff: '官方「Plugins → Subagent → Model selection」未启用，配置已隐藏。先在那里开启并勾选模型。',
      selectionEmpty: '官方「Subagent → Model selection」没有勾选任何模型，配置已隐藏。',
    }
    const en = {
      title: 'Subagent dispatch',
      summary: 'Dispatch by identity: each identity has one fixed model, a dispatch rule the main model sees, and a child brief.',
      hint: 'The identity name and dispatch rule join the main model prompt; the child brief is only attached when dispatching. Saves apply immediately.',
      identities: 'identities',
      identityName: 'Identity (visible to the main model)',
      identityNameHint: 'The name the main model sees in the dispatch list.',
      when: 'Dispatch rule (visible to the main model)',
      whenHint: 'Say which task belongs to this identity.',
      prompt: 'Child brief (hidden from the main model)',
      promptHint: 'Prepended to the task; the child does not share this conversation, so keep it self-contained.',
      route: 'Fixed model',
      chooseModel: 'Choose a model…',
      unconfigured: 'No model yet',
      effort: 'Reasoning effort',
      effortDefault: 'Model default',
      save: 'Save',
      saving: 'Saving…',
      failed: 'The Host refused this change; the draft was kept.',
      unavailable: 'This row is not configurable right now.',
      catalogFailed: 'Could not read the model catalog; stored routes are kept.',
      noAgents: 'No identities configured.',
      noMatchingAgents: 'None of the checked models has an identity; change an identity model to a checked route.',
      selectionLoading: 'Reading the official Subagent -> Model selection…',
      selectionUnavailable: 'The official Subagent -> Model selection is not readable yet; showing every identity until it loads.',
      selectionError: 'Could not read the official Subagent -> Model selection. Press Refresh to retry; every identity is shown meanwhile.',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      refreshHint: 'Re-read the official model checks and the model catalog',
      synced: 'Checked models:',
      selectionOff: 'The official Plugins -> Subagent -> Model selection is off, so this configuration is hidden. Enable it and check the models there first.',
      selectionEmpty: 'No model is checked in the official Subagent -> Model selection, so this configuration is hidden.',
    }

    const T = {
      border: '1px solid var(--dsw-alias-border-l1)',
      borderStrong: '1px solid var(--dsw-alias-border-l2)',
      label: 'var(--dsw-alias-label-primary)',
      muted: 'var(--dsw-alias-label-secondary)',
      error: 'var(--dsw-alias-state-error-primary)',
      brand: 'var(--dsw-alias-brand-primary)',
      surface: 'var(--dsw-alias-bg-layer-1)',
      fieldBg: 'var(--dsw-alias-bg-layer-2)',
    }

    const control = {
      font: 'inherit',
      fontSize: 13,
      lineHeight: '20px',
      color: T.label,
      background: T.fieldBg,
      border: T.borderStrong,
      borderRadius: 8,
      padding: '7px 10px',
      width: '100%',
      boxSizing: 'border-box',
      outlineColor: T.brand,
    }

    function Field(props, control) {
      const content = control !== undefined ? control : props.children
      return h('label', { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } },
        h('span', { style: { fontSize: 12, fontWeight: 600, color: T.label } }, props.label),
        content,
        props.hint ? h('span', { style: { fontSize: 12, lineHeight: '18px', color: T.muted } }, props.hint) : null,
      )
    }

    function ConfigPage(props) {
      const { view, form, t, loadCatalog, loadSelection, subscribeSelection } = props
      const [catalog, setCatalog] = React.useState([])
      const [catalogFailed, setCatalogFailed] = React.useState(false)
      const [draft, setDraft] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [failed, setFailed] = React.useState(false)
      const state = form && form.state
      const value = state && state.value
      const revision = state && state.revision

      const [selection, setSelection] = React.useState({ status: 'loading', enabled: false, routes: [] })
      const reloadSelection = React.useCallback(async () => {
        setSelection((current) => ({ ...current, status: 'loading' }))
        try {
          const next = await loadSelection()
          setSelection({ status: 'ready', enabled: next.enabled, routes: next.routes })
        } catch {
          setSelection({ status: 'error', enabled: false, routes: [] })
        }
      }, [loadSelection])

      React.useEffect(() => { reloadSelection() }, [reloadSelection])
      React.useEffect(() => subscribeSelection(reloadSelection), [subscribeSelection, reloadSelection])

      React.useEffect(() => {
        let cancelled = false
        if (typeof loadCatalog !== 'function') return undefined
        loadCatalog().then((response) => {
          if (cancelled) return
          if (response && response.ok) setCatalog(response.value.groups || [])
          else setCatalogFailed(true)
        }).catch(() => { if (!cancelled) setCatalogFailed(true) })
        return () => { cancelled = true }
      }, [loadCatalog])

      React.useEffect(() => {
        setDraft(value === undefined ? null : JSON.parse(JSON.stringify(value)))
        setFailed(false)
      }, [revision])

      if (view === 'summary') {
        const count = value && Array.isArray(value.agents) ? value.agents.length : 0
        return h('span', { style: { color: T.muted, fontSize: 13 } }, `${count} ${t('identities')}`)
      }
      if (form === undefined || state === undefined || draft === null) return h('p', { style: { margin: 0, color: T.muted } }, t('unavailable'))

      const agents = Array.isArray(draft.agents) ? draft.agents : []
      const writable = state.writable !== false

      const selectionReady = selection.status === 'ready'
      const selectionEnabled = selectionReady && selection.enabled === true
      const allowedRoutes = selectionEnabled && Array.isArray(selection.routes) ? selection.routes : []
      // Only the official switch being OFF (or an empty checked list) hides the
      // configuration. While that data is loading or unreadable we keep the
      // page editable instead of blocking it.
      const gating = selectionReady && selectionEnabled && allowedRoutes.length > 0
      const allowedSet = new Set(allowedRoutes)
      const agentRoute = (agent) => `${agent.provider}/${agent.model}`
      const configured = (agent) => typeof agent.provider === 'string' && agent.provider.length > 0 &&
        typeof agent.model === 'string' && agent.model.length > 0
      // Unconfigured identities stay visible so a fresh install can pick a model;
      // only configured routes are filtered by the official allowlist.
      const visibleAgents = agents.filter((agent) => !configured(agent) || !gating || allowedSet.has(agentRoute(agent)))

      if (selectionReady && !selectionEnabled) return h('p', { style: { margin: 0, color: T.muted } }, t('selectionOff'))
      if (selectionReady && selectionEnabled && allowedRoutes.length === 0) return h('p', { style: { margin: 0, color: T.muted } }, t('selectionEmpty'))

      const routeOptions = () => {
        const routes = gating
          ? allowedRoutes
          : catalog.flatMap((group) => (group.models || []).map((model) => `${group.id}/${model.id}`))
        return routes.map((route) => {
          const [provider, ...rest] = route.split('/')
          const model = rest.join('/')
          let label = route
          for (const group of catalog) {
            if (group.id !== provider) continue
            const found = (group.models || []).find((entry) => entry.id === model)
            if (found) label = `${group.name} · ${found.name}`
          }
          return h('option', { key: route, value: route }, label)
        })
      }

      const patchAgent = (index, key, next) => {
        setDraft((current) => ({
          ...current,
          agents: current.agents.map((agent, at) => (at === index ? { ...agent, [key]: next } : agent)),
        }))
      }

      const save = async () => {
        const ops = []
        agents.forEach((agent, index) => {
          const base = (value && Array.isArray(value.agents) ? value.agents[index] : undefined) || {}
          for (const key of ['name', 'when', 'instructions', 'provider', 'model']) {
            const next = agent[key]
            const before = base[key]
            if ((next === undefined ? '' : next) === (before === undefined ? '' : before)) continue
            ops.push({ op: 'set', path: ['agents', index, key], value: next === undefined ? '' : next })
          }
          const effort = agent.reasoningEffort === undefined ? '' : agent.reasoningEffort
          const beforeEffort = base.reasoningEffort === undefined ? '' : base.reasoningEffort
          if (effort !== beforeEffort) {
            ops.push(effort === ''
              ? { op: 'unset', path: ['agents', index, 'reasoningEffort'] }
              : { op: 'set', path: ['agents', index, 'reasoningEffort'], value: effort })
          }
        })
        if (ops.length === 0) return
        setSaving(true)
        try {
          const accepted = await form.mutate(ops, state.revision)
          setFailed(!accepted)
        } catch {
          setFailed(true)
        } finally {
          setSaving(false)
        }
      }

      const effortOptions = (agent) => {
        const options = [h('option', { key: '', value: '' }, t('effortDefault'))]
        for (const group of catalog) {
          if (group.id !== agent.provider) continue
          for (const model of group.models || []) {
            if (model.id !== agent.model) continue
            const efforts = model.reasoning && model.reasoning.efforts ? model.reasoning.efforts : []
            for (const effort of efforts) {
              options.push(h('option', { key: effort.id, value: effort.id }, effort.name ? effort.name : effort.id))
            }
          }
        }
        const stored = agent.reasoningEffort
        if (stored && !options.some((option) => option.props.value === stored)) {
          options.push(h('option', { key: stored, value: stored }, stored))
        }
        return options
      }

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16, color: T.label } },
        h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' } },
          h('p', { style: { margin: 0, flex: 1, fontSize: 13, lineHeight: '20px', color: T.muted } }, t('hint')),
          h('button', {
            type: 'button',
            onClick: reloadSelection,
            disabled: selection.status === 'loading',
            title: t('refreshHint'),
            style: {
              font: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              color: T.brand,
              background: 'transparent',
              border: T.borderStrong,
              borderRadius: 8,
              padding: '5px 10px',
              whiteSpace: 'nowrap',
              cursor: selection.status === 'loading' ? 'not-allowed' : 'pointer',
            },
          }, selection.status === 'loading' ? t('refreshing') : t('refresh'))),
        selection.status === 'error'
          ? h('p', { style: { margin: 0, fontSize: 12, color: T.error } }, t('selectionError'))
          : selectionReady
            ? h('p', { style: { margin: 0, fontSize: 12, color: T.muted } }, `${t('synced')} ${allowedRoutes.length}`)
            : h('p', { style: { margin: 0, fontSize: 12, color: T.muted } }, t('selectionLoading')),
        catalogFailed ? h('p', { style: { margin: 0, fontSize: 12, color: T.error } }, t('catalogFailed')) : null,
        agents.length === 0 ? h('p', { style: { margin: 0, color: T.muted } }, t('noAgents')) : null,
        agents.length > 0 && visibleAgents.length === 0
          ? h('p', { style: { margin: 0, color: T.muted } }, t('noMatchingAgents'))
          : null,
        visibleAgents.map((agent) => {
          const index = agents.indexOf(agent)
          return h('section', {
            key: agent.id,
            style: {
              border: T.border,
              borderRadius: 12,
              background: T.surface,
              padding: '14px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            },
          },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 } },
              h('strong', { style: { fontSize: 14, fontWeight: 600 } }, agent.name || agent.id),
              h('code', {
                style: {
                  fontSize: 12,
                  color: T.muted,
                  background: T.fieldBg,
                  border: T.border,
                  borderRadius: 999,
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                },
              }, configured(agent) ? `${agent.provider}/${agent.model}` : t('unconfigured'))),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 12 } },
              Field({ label: t('identityName'), hint: t('identityNameHint') },
                h('input', {
                  type: 'text',
                  value: agent.name || '',
                  disabled: !writable,
                  placeholder: t('identityNameHint'),
                  style: control,
                  onChange: (event) => patchAgent(index, 'name', event.target.value),
                })),
              Field({ label: t('route') },
                h('select', {
                  value: configured(agent) ? `${agent.provider}/${agent.model}` : '',
                  disabled: !writable,
                  style: control,
                  onChange: (event) => {
                    const next = String(event.target.value)
                    if (next === '') {
                      patchAgent(index, 'provider', '')
                      patchAgent(index, 'model', '')
                      return
                    }
                    const [provider, ...rest] = next.split('/')
                    patchAgent(index, 'provider', provider)
                    patchAgent(index, 'model', rest.join('/'))
                  },
                },
                  h('option', { value: '' }, t('chooseModel')),
                  routeOptions()))),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 12 } },
              Field({ label: t('when'), hint: t('whenHint') },
                h('textarea', {
                  value: agent.when || '',
                  disabled: !writable,
                  rows: 2,
                  placeholder: t('whenHint'),
                  style: { ...control, resize: 'vertical', minHeight: 60 },
                  onChange: (event) => patchAgent(index, 'when', event.target.value),
                })),
              Field({ label: t('effort') },
                h('select', {
                  value: agent.reasoningEffort || '',
                  disabled: !writable,
                  style: control,
                  onChange: (event) => patchAgent(index, 'reasoningEffort', event.target.value === '' ? undefined : event.target.value),
                }, effortOptions(agent)))),
            Field({ label: t('prompt'), hint: t('promptHint') },
              h('textarea', {
                value: agent.instructions || '',
                disabled: !writable,
                rows: 4,
                placeholder: t('promptHint'),
                style: { ...control, resize: 'vertical', minHeight: 88 },
                onChange: (event) => patchAgent(index, 'instructions', event.target.value),
              })),
          )
        }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('button', {
            type: 'button',
            onClick: save,
            disabled: !writable || saving,
            style: {
              font: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              color: T.brand,
              background: 'transparent',
              border: `1px solid ${T.brand}`,
              borderRadius: 8,
              padding: '7px 16px',
              cursor: writingDisabled(writable, saving),
            },
          }, saving ? t('saving') : t('save')),
          failed ? h('span', { style: { fontSize: 12, color: T.error } }, t('failed')) : null),
      )
    }

    function writingDisabled(writable, saving) {
      return !writable || saving ? 'not-allowed' : 'pointer'
    }

    const inject = ['slots', 'locale', 'remote', 'remote.session', 'remote.settings']

    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'subagent-dispatch: labels')

      /** Read the official model allowlist straight from the settings remote. */
      const loadSelection = async () => {
        const response = await ctx.remote.settings.describe()
        if (!response || response.ok !== true) throw new Error('settings/describe failed')
        const view = (response.value.namespaces || []).find((entry) => entry.ns === 'subagent-model-selection-settings')
        if (view === void 0) return { enabled: false, routes: [] }
        const section = view.value || {}
        const routes = Array.isArray(section.allowedModels)
          ? section.allowedModels
            .filter((route) => route && typeof route.provider === 'string' && typeof route.model === 'string')
            .map((route) => `${route.provider}/${route.model}`)
          : []
        return { enabled: section.enabled === true, routes }
      }

      /** Refresh whenever the official settings document changes. */
      const subscribeSelection = (callback) => ctx.remote.$on('settings/document-updated', () => callback())

      ctx.effect(() => ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
        name: 'plugins.row.config',
        key: 'dsh-subagent-custom-dispatch#subagent-dispatch',
        inject: () => ({ t, loadSelection, subscribeSelection, loadCatalog: () => ctx.remote.session.modelCatalog() }),
      }, ConfigPage)), 'subagent-dispatch: config page')
    }

    return { inject, apply }
  },
})
