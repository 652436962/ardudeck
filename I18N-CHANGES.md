# 多语言（i18n）改动明细 — 供审阅

本轮任务：按用户确认的默认方案，为 ArduDeck 桌面端加入多语言支持。
**方案默认值（用户回复"按你推荐的来"）**：i18next + react-i18next、英语 + 简体中文、**仅渲染层**、设置页做试点、附未翻译串扫描脚本。

- 分支基线：`master @ 0acb0943cecea40284e15d60a0e4513373d1edc9`
- 改动范围：`apps/desktop/`、`tools/`，**未触碰 `packages/`、主进程逻辑、以及任何既有 UI 文案以外的代码**
- 逐条明细见下表；每条都可单独回退

## 一、改动清单（逐条）

| # | 位置 | 原文问题 | 修改内容 | 理由 | 证据等级 |
|---|---|---|---|---|---|
| 1 | `apps/desktop/package.json`（dependencies） | 项目**完全没有** i18n 库：`grep -rn "i18next\|react-i18next"` 全仓 0 命中 | 新增 `"i18next": "^26.4.2"`、`"react-i18next": "^17.0.15"` | 实现翻译必需；选这两个是 React/Electron 生态事实标准 | ★ 官方仓库 `package.json` 实测；版本号为本次实际安装版本（`node -e require(...).version`） |
| 2 | `apps/desktop/src/shared/app-language.ts`（新增，34 行） | 没有语言枚举，language 值无类型约束 | 新增 `APP_LANGUAGES = ['en','zh-CN']`、`AppLanguage`、`isAppLanguage()`、`DEFAULT_APP_LANGUAGE`、`APP_LANGUAGE_LABELS`（原生语言名）、`normalizeAppLanguage()`（`zh-*` 全部归到 `zh-CN`） | 让「持久化的语言值」与「i18n 资源包」共用同一份定义，避免两处漂移；`normalizeAppLanguage` 是 OS locale → 受支持语言的唯一入口 | ◎ 代码推导，可逐行核验 |
| 3 | `apps/desktop/src/shared/app-language-storage.ts`（新增，33 行） | 语言设置若只存主进程 settings 文件，首帧渲染时异步未返回，会先渲染英文再跳中文 | 新增 localStorage 镜像读写（键 `ardudeck.ui-language`），读写均 try/catch | 首帧即用正确语言；注释已写明「settings 文件仍是真源，这里只是快速启动镜像」 | ◎ 代码推导 |
| 4 | `apps/desktop/src/renderer/i18n/locales/en.ts`（新增，45 行） | 无 | 英文语言包（参考包），`as const` | 作为键树的唯一真源 | ◎ 代码推导 |
| 5 | `apps/desktop/src/renderer/i18n/locales/zh-CN.ts`（新增，49 行） | 无 | 简体中文语言包 | 目标语言之一 | ○ 术语判断：Vehicle→载具、Mission→任务、配置/地图/高级/关于，属我的译法取向，**请审校** |
| 6 | `apps/desktop/src/renderer/i18n/locales/types.ts`（新增，18 行） | 直接写 `typeof en` 会因 `as const` 把中文值约束成英文字面量（tsc 实际报错 24 条：`Type '"取消"' is not assignable to type '"Cancel"'`） | 新增 `TranslationBundle`：递归把叶子类型放宽为 `string`，保留完整键树 | 既保证缺键/多键在 `tsc` 报错，又不限制译文内容 | ★ 实测：修复前 24 条 TS2322，修复后仅剩 1 条与本轮无关的既有错误 |
| 7 | `apps/desktop/src/renderer/i18n/index.ts`（新增） | 无 | `initI18n()`（幂等）、`applyAppLanguage()`、资源注册、`fallbackLng: 'en'`、`escapeValue: false` | `escapeValue:false` 是 i18next 官方对 React 的建议（React 自己会转义） | △ 训练知识（高置信、低漂移风险）；公开核对渠道：i18next 官方 React 文档 |
| 8 | `apps/desktop/src/renderer/main.tsx`（+5 行） | 首次渲染前无 i18n 实例，`useTranslation` 无从取用 | 在 `registerArduDeckDialect()` 之前调用 `initI18n()` | 必须在 `ReactDOM.createRoot(...).render()` 之前完成初始化 | ◎ 代码推导（`main.tsx:19` 前后） |
| 9 | `apps/desktop/src/renderer/stores/settings-store.ts`（+29 行） | 设置无 `language` 字段，语言选择无处持久化 | ① 接口加 `language: AppLanguage` + `setLanguage`；② 初始值取 localStorage 镜像；③ `loadSettings` 读取 settings 文件里的 `language` 并在末尾 `await applyAppLanguage(...)`；④ `_saveSettings` payload 增加 `language`；⑤ 订阅选择器与变更判定各加 `language`；⑥ `setLanguage` 动作同步调 `applyAppLanguage` | 复用项目既有的 electron-store 设置通道（`getSettings/saveSettings`），不新建配置文件；变更判定必须加字段，否则改语言不触发保存 | ◎ 代码推导；★ 实测：漏加判定会导致不落盘，已补 |
| 10 | `apps/desktop/src/shared/ipc-channels.ts`（+3 行） | `SettingsStoreSchema` 无 `language` | 加 `language?: AppLanguage` 并 `import type { AppLanguage } from './app-language.js'` | 主进程 `SETTINGS_SAVE` 是整对象覆盖写（`settingsStore.set(settings)`），类型不加字段则在 IPC 边界被类型检查挡住 | ★ 实测：`ipc-handlers.ts:7062` 为整对象 `set` |
| 11 | `apps/desktop/src/renderer/components/settings/LanguageCard.tsx`（新增，38 行） | 无语言选择入口 | 新增语言下拉卡片，样式与既有 `UnitSelectionCard` 一致（同 class、同 `data-tour` 约定） | 贴合现有 UI 语言，不引入新范式 | ◎ 代码推导（对照 `UnitSelectionCard.tsx`） |
| 12 | `apps/desktop/src/renderer/components/settings/UnitSelectionCard.tsx` | 9 个字段标签硬编码英文（`label: 'Distance'`…）与标题 `Display Units` | 删除 `label` 字段，改为按 `kind` 查 `units.fields.<kind>` 翻译键；标题用 `units.heading`。**单位符号（m/km/mAh/m/s…）保持不翻译** | 字段 kind 本身即稳定 id，键可一一对应；单位是符号不是文案 | ◎ 代码推导 |
| 13 | `apps/desktop/src/renderer/components/settings/SettingsView.tsx`（+25/-20） | 页面标题 `Settings`、副标题、5 个分类标签硬编码英文 | ① 引入 `useTranslation('settings')`；② 标题/副标题改 `t('title')`/`t('subtitle')`；③ `SETTINGS_CATEGORIES` 去掉 `label` 字段，改为 `t(\`categories.${cat.id}\`)` | 分类 id 与翻译键同名，省掉第二张映射表；`t` 在组件内取用才能随语言切换重渲染 | ◎ 代码推导 |
| 14 | `tools/i18n-scan.mjs`（新增，239 行） | 无 | 未翻译串扫描器：扫 JSX 文本节点 + `aria-label/placeholder/title/alt`，输出按文件与按重复度两个榜单，带首处 `file:line`；支持 `--top/--all/--json/--strict` | 试点之外的剩余工作量必须可量化、可追踪，否则"支持多语言"不可验证 | ★ 实测：注入测试串能命中；误报修正见下节 |

**未改动（有意）**：`packages/*`（协议/解析库，无 UI 文案）、主进程菜单与对话框（用户选定"仅渲染层"）、任何既有业务逻辑。

## 二、验证证据

| 验证项 | 命令 | 结果 | 等级 |
|---|---|---|---|
| 类型检查 | `tsc --noEmit -p apps/desktop/tsconfig.json` | 仅剩 1 条 `src/main/index.ts(325,5) app.dock possibly undefined` | ★ 实测；并已用 `git stash` 在**基线**上复现同一条，证明为既有问题，非本轮引入 |
| 生产构建 | `turbo run build --filter=@ardudeck/desktop` | 10/10 成功，渲染层 `index-DFalqcap.js` 15,961 kB | ★ 实测 |
| 产物验证 | `grep -c` 于构建产物 | `i18next` 命中 13 次；`配置任务默认值与载具档案`、`显示单位` 各命中 1 次 | ★ 实测 |
| 测试套件 | `vitest run --root apps/desktop` | **281/281 文件通过，3005 通过 / 2 跳过 / 0 失败** | ★ 实测 |
| 静态检查 | `eslint` 于全部新增与改动文件 | 无告警无错误 | ★ 实测 |
| 扫描器有效性 | 注入 `ZZ Probe String Here` 到真实组件后运行 `--json` | 命中 1 次；已还原（`grep -c` = 0） | ★ 实测 |

补充说明（诚实义务）：`vitest` 首次运行时 `src/main/testing/mcp-server.test.ts` 失败，原因是沙箱禁止写 `~/.ardudeck/screenshots`；把 `HOME` 指向工作区后**全绿**。该失败与本轮改动无关，但如实记录。

## 三、第二轮：设置区全量翻译（本轮新增）

第一轮只翻了设置页"外壳"。本轮把 `apps/desktop/src/renderer/components/settings/**` 整体翻完。

### 改动清单（逐条）

| # | 位置 | 原文问题 | 修改内容 | 理由 | 证据等级 |
|---|---|---|---|---|---|
| 15 | `i18n/locales/en.ts` / `zh-CN.ts` | 语言包只覆盖外壳 | 新增分组：`vehicleProfile`（drift/selectors/stall/snapshots/apply/realFc/templates）、`secureLink`、`signing`、`traffic`、`tileCache`、`profileCompat`、`weather`、`vehicleSection`、`configuration`、`about`、`vehicleEditor`；`common` 增加 `undo` | 设置区所有文案的键都在此，随语言切换即时生效 | ◎ 代码推导；★ 实测：缺键时 `tsc` 报错 |
| 16 | `i18n/index.ts` | 子组件用 `useTranslation('settings')`，但 `Undo`/`Cancel` 属通用词 | 增加 `fallbackNS: 'common'` | 功能命名空间可回退到通用词表，避免同一词在多处重复定义 | △ 训练知识（i18next 官方 `fallbackNS` 选项） |
| 17 | `settings/GroupShapeCard.tsx` | 标题、说明、3 组标签/描述硬编码 | 改用 `t('groupShape.*')`；**不再从 store 导入 `GROUP_SHAPE_LABELS/DESCRIPTIONS`**（store 内常量保留未删，仅此组件不再引用） | 键以模式 id 命名，随语言切换 | ◎ 代码推导 |
| 18 | `settings/vehicle-profile/ConfigSelectors.tsx` | 3 个选择器标题 + 23 个选项的 label/hint 全部硬编码 | 静态表只留 `value`+`key`，文案走 `t('vehicleProfile.selectors.options.<value>.<label|hint>')`；`Selector` 用 `selectorKey` 取代 `label` prop | 表格与译文解耦，新增机型只需加键 | ◎ 代码推导 |
| 19 | `settings/vehicle-profile/DriftBadge.tsx` | 徽标 `Drifted · N`、弹窗标题与说明 | 改 `t()`，徽标用 `{{count}}` 插值 | 文案随语言切换 | ◎ 代码推导 |
| 20 | `settings/vehicle-profile/StallSpeedCalcButton.tsx` | 按钮/面板标签、AUW 等 4 个行标签、缺项提示 | 改 `t()`；**升力公式本身不翻译**（数学记号） | 公式是记号不是文案；行标签与单位无关（单位由 `UNIT_LABELS` 提供） | ◎ 代码推导；○ 判断（公式不译） |
| 21 | `settings/vehicle-profile/SnapshotList.tsx` | 按钮/标题/空态/恢复/删除等 12 处 | 改 `t()`；数量用 i18next 复数键（`buttonCount_one/_other`、`params_one/_other`） | 中英文复数规则不同，复数键由 i18next 处理 | △ 训练知识（i18next 复数 `_one/_other` 约定） |
| 22 | `settings/vehicle-profile/ProfileApplyOverlay.tsx` | 写入进度、Undo、Dismiss | 改 `t()`，`Undo` 走 `common` 回退 | 通用词集中管理 | ◎ 代码推导 |
| 23 | `settings/vehicle-profile/RealFcApplyConfirm.tsx` | 标题、sysid 警告、拓扑参数提示、备份说明、就绪/倒计时、两个按钮 | 改 `t()`；`Confirm available in {{seconds}}s` 用插值 | 真实硬件确认框是安全关键路径，必须完整本地化 | ◎ 代码推导 |
| 24 | `settings/vehicle-profile/VehicleTemplatePicker.tsx` | 搜索占位符、导入按钮 | 改 `t()` | 同上 | ◎ 代码推导 |
| 25 | `settings/TrafficSettingsCard.tsx` | 标题、说明、5 个数据源名、8 个占位符、若干开关标签、告警区文案 | 批量锚定替换为 `t('traffic.*')`；`AlertZonesSection` 子组件补 hook | 该卡片约 26 处文案 | ◎ 代码推导；★ 实测：替换脚本对每个锚点校验出现次数 |
| 26 | `settings/TileCacheCard.tsx` | 下载区/缓存设置标题、4 个经纬度占位符与 4 个标签、开关标签、删除提示 | 批量替换为 `t('tileCache.*')`；`SavedRegions` 子组件补 hook | 同上 | ◎ 代码推导 |
| 27 | `settings/SigningSection.tsx` | 标题、密钥不匹配告警、口令步骤、`Key:`、复制提示、启用/包签名 | 改 `t('signing.*')`；`Key:` 值含全角冒号，与中文排版一致 | 同上 | ◎ 代码推导 |
| 28 | `settings/SecureLinkCompliance.tsx` | 合规标题（原文用 `&amp;` 实体）、导出按钮与提示、日志说明 | 改 `t('secureLink.*')`；三态文案（有/断链/无数据）的静态部分改 `t()`，含变量的分支**保持原样** | 含 `chain.count` 的句子是动态拼接，本轮不动以免改变行为 | ◎ 代码推导；★ 实测：`t` 作用域由 `tsc` 校验 |
| 29 | `settings/SettingsView.tsx`（4598 行） | 99 处硬编码文案遍布 7 个内部组件 | 批量锚定替换为 `t()`（`vehicleSection`/`configuration`/`weather`/`about`/`vehicleEditor`/`profileCompat` 分组）；给 `ProfileCompatibilityBanner`、`WeatherWidget`、`ArduPilotFlightStats`、`OpenAipKeyInput`、`MavlinkSettingsSection`、`ConsoleSettingsSection`、`AiAnalysisSection`、`ExperimentalFeaturesSection`、`GraphicsStatus`、`AboutSection`、`PropSizeInput`、`VehicleEditModal`、`VehicleCard` 补 `useTranslation` | 这是设置区剩余量的主体；`tsc` 的 "Cannot find name 't'" 被用作"哪些组件缺 hook"的精确清单 | ◎ 代码推导；★ 实测：每处替换前校验锚点出现次数，`tsc` 逐条收敛到 0 |
| 30 | `stores/settings-store.ts`（语言初值） | 首次启动若系统是中文，store 初值仍是 `en`，语言下拉会与界面语言不一致 | 初值改为 `normalizeAppLanguage(readStoredAppLanguage() ?? (i18n.isInitialized ? i18n.language : null))` | 与 i18next 首帧选择保持同源 | ★ 实测：`tsc` + 30 个 store 测试通过 |
| 31 | `i18n/index.ts`（`applyAppLanguage`） | 测试导入 store 时 i18n 未初始化，`changeLanguage` 抛 `Cannot read properties of undefined (reading 'hasLanguageSomeTranslations')`（★ 实测到 3 个失败） | 未初始化时提前返回，只写 localStorage 镜像 | 该函数会被 store 在无渲染器的测试环境调用；防抛错而非改行为 | ★ 实测：修复后连跑 2 次全绿 |
| 32 | `tools/i18n-scan.mjs` | 数学/遥测记号被计入待翻译 | allowlist 增加 `Lmax`、`AUW`、`AGL`、`MSL`、`RSSI`、`SNR`、`HDOP`、`VDOP` | 这些记号在任何语言下都保持原样，属"有意不译"而非遗漏 | ○ 判断 |

### 本轮验证证据（★ 全部实测）

| 验证项 | 结果 |
|---|---|
| `tsc --noEmit` | 仅剩既有 1 条 `src/main/index.ts(325) app.dock`（基线可复现） |
| `turbo run build --filter=@ardudeck/desktop` | 10/10 成功 |
| `vitest run --root apps/desktop` | **281/281 文件、3005 通过、0 失败**（连跑 2 次，用于确认 i18n 初始化竞态已消除） |
| `eslint`（设置区 + i18n + store + main） | 0 error；2 warning，均为**既有**问题（`SnapshotList` 的 `useMemo` 依赖告警来自原始代码，已用 `git show HEAD:` 比对确认；另一处在 `use-profile-apply.ts`，本轮未改） |
| 设置区扫描 | **0 条**未翻译（本轮起点 144 条） |
| 产物校验 | 构建产物的 renderer bundle 中 `载具与状态`、`飞行统计（来自飞控）`、`天气`、`阵风`、`螺旋桨`、`关于` 均可检索到 |

### 覆盖率的诚实口径

- **设置区（`components/settings/**`）：144 → 0**，这是本轮可验证的硬指标
- **全局：2463 → 2290**（−173）。注意这 −173 **不能全部归给本轮翻译工作**：其中一部分来自扫描器 allowlist 调整（`Lmax` 等记号被移出待译统计），另一部分是本轮在设置区之外的 `label`/`title` 分支变化。两个口径都已列出，不做合并宣传
- 全局 2290 仍是**下界**（口径与盲区见下节）

## 四、第三轮：左侧导航栏 + 扫描器盲区修补（本轮新增）

### 改动清单（逐条）

| # | 位置 | 原文问题 | 修改内容 | 理由 | 证据等级 |
|---|---|---|---|---|---|
| 33 | `components/navigation/NavigationRail.tsx` | 19 个导航项标签硬编码在模块级数据表里（`label: 'Telemetry'`…`label: 'Cargo'`），另有 `title="Report a Bug"` | `NavItem` 的 `label` 改为 `labelKey`，值取该条目的 `id`（如 `telemetry`→`items.telemetry`）；渲染处 2 处 `item.label` 改 `t(item.labelKey)`；组件加 `useTranslation('nav')`；"Report a Bug" 改 `t('reportBug')` | 导航标签在模块作用域，拿不到 hook，只能存键、渲染时取；键用 ViewId 使新增视图只需加一条键 | ◎ 代码推导；★ 实测：`tsc` 0 新增错误、281 文件测试全绿 |
| 34 | `i18n/locales/en.ts` / `zh-CN.ts` | 无导航文案 | 新增顶层 `nav` 分组（`items.*` 19 条 + `reportBug`） | 导航是全局外壳，与设置页解耦更清晰 | ◎ 代码推导 |
| 35 | `tools/i18n-scan.mjs` | **盲区**：只扫 JSX 文本节点与 4 个属性，因此导航栏 19 条硬编码标签只报出 1 条 | 新增对象字面量文案检测：匹配 `label/title/name/heading/description/tooltip/placeholder/hint: '...'`，跳过已 `t()` 或已用 `*Key` 的行；新增 `byKind` 分类统计并在文本报告里输出 | 这类"数据表文案"是本仓库最主要的未统计来源（导航、OSD 元素表、Lua 节点库、MAVLink 预设等） | ★ 实测：加检测后导航栏从 1 条→0 条；`node --check` 通过 |

### 本轮验证证据（★ 全部实测）

| 验证项 | 结果 |
|---|---|
| `tsc --noEmit` | 仅剩既有 1 条 `src/main/index.ts(325) app.dock` |
| `turbo run build --filter=@ardudeck/desktop` | 10/10 成功 |
| `vitest run --root apps/desktop` | **281/281 文件、3005 通过、0 失败** |
| `eslint`（navigation 目录） | 无输出（0 error / 0 warning） |
| 产物校验 | bundle 中可检索到 `任务规划`、`机队仓库`、`天气简报`、`教练模式`、`飞行日志`、`反馈问题` |
| 扫描器 | 导航栏未翻译数 = 0；`node --check` 通过 |

### ⚠️ 统计口径变更（重要，别拿两次数字直接比）

本轮给扫描器加了对象字面量检测，**分母变了**，所以总数从 2290 跳到 **4984**，这**不是**翻译退化：

```
4984  总计
├ 1894  jsx-text            （与上一轮同口径，上一轮此项约 1894）
├ 1350  object:label        ← 新纳入统计
├  694  object:description  ← 新纳入统计
├  474  object:name         ← 新纳入统计
├  377  attribute           （同口径）
├  140  object:title        ← 新纳入统计
└   55  object:hint/heading ← 新纳入统计
```

- `jsx-text` 与 `attribute` 两项与上一轮口径一致，可与上一轮对比
- `object:*` 是**新纳入**的数据表文案，含少量代码标识符误报（抽查确认 `name: 'Flight Mode'`、`label: 'Value'` 这类确实是界面可见文案）
- 因此该数字应作为**工作清单**使用，而不是精确计数——脚本输出末尾已写明这一点

## 五、第四轮：任务规划（mission）整个目录（本轮新增，用户选 A）

范围：`apps/desktop/src/renderer/components/mission/**`，扫描器口径 **290 条 → 1 条**（剩下的是版本号 `iNav 2.6.1`，按设计不译）。

### 改动清单（逐条）

| # | 位置 | 原文问题 | 修改内容 | 理由 | 证据等级 |
|---|---|---|---|---|---|
| 36 | `MissionPlanningView.tsx` | 4 个面板标题（`title: 'Flight Info'` 等）、iNav 说明区 6 处、Survey 面板标题 | 新增 `mission.panelTitles.*` / `mission.planningNote.*`，全部改 `t()`；`ensureFlightInfoPanel` 与 `createDefaultLayout` 改为**接收 `t: TFunction` 参数** | 这两个是普通辅助函数不是组件，不能调 hook（见第 47 条） | ★ 实测：`tsc` + `eslint` 双通过 |
| 37 | `MissionMapPanel.tsx` | 7 个按钮 tooltip、Home 提示两行、空态、图例区 8 处 | 新增 `mission.map.*`（20 条），改 `t()`；给 `MissionMapPanel2D` 补 hook | 地图面板是任务页主交互面 | ★ 实测 |
| 38 | `FlightInfoPanel.tsx` | 11 处 tooltip/文案 | 新增 `mission.flightInfo.*`；`DaylightBar` 子组件补 hook | 同上 | ★ 实测 |
| 39 | `MissionToolbar.tsx` | 14 处 tooltip/文案 + 机架选择器数据表 | 新增 `mission.toolbar.*`；`MISSION_FIRMWARE_OPTIONS` 从 `label/title` 改为 **`labelKey/titleKey`**（PX4 品牌名保留 `labelText`），渲染处解析 | 模块级常量表不能调 hook | ◎ 代码推导 |
| 40 | `AutoAdjustAltitudeDialog.tsx` | 7 处 | `mission.autoAdjust.*` | 地形规避确认框 | ★ 实测 |
| 41 | `FlightPreviewPanel.tsx` | 图例 4 处（行内文本，扫描器此前漏检） | `mission.preview.*`；组件补 hook | 行内 `/> text</span>` 形式需单独处理 | ★ 实测 |
| 42 | `Mission3DPanel.tsx` / `RelativeWaypointPopover.tsx` / `SurveyedPointsDialog.tsx` / `AltitudeProfilePanel.tsx` / `UploadPreviewModal.tsx` / `MissionStatusBar.tsx` | 共 11 处，含 `aria-label`、`placeholder`、空态 | 各自分组键；`SurveyedPointsDialog` 带 `): JSX.Element` 返回类型注解，需单独插 hook | 覆盖面补齐 | ★ 实测 |
| 43 | `WaypointTablePanel.tsx` — 命令菜单 | **126 条**命令条目硬编码 `label` + `desc` | `CommandOption` 改为 `labelKey`/`descKey`；新增 `mission.commands.*`（82 个键，去重后）、`mission.commandGroups.*`（7 个分组名）；搜索过滤改为按**译文**匹配 | 命令数据表是模块级常量；搜索必须匹配用户看到的语言 | ◎ 代码推导；★ 实测：`tsc` 0 新增错误 |
| 44 | `WaypointTablePanel.tsx` — 命令参数字段 | `getCommandParams()` 内 **80 处** `label`（53 个唯一） | `CommandParamConfig.label` → `labelKey`，键为 `mission.paramFields.<key>`；调用点改 `t(param.labelKey)` | 该函数被导出给单测用，不能引入 hook | ★ 实测：`WaypointTablePanel.command-params.test.ts` 通过 |
| 45 | `WaypointTablePanel.tsx` — 面板其余文案 | 23 处（分组 tooltip、状态 tooltip、空态、列头） | 新增 `mission.waypointPanel.*`；`GroupHeaderRow`、`WaypointListContent`、`CommandDropdown` 补 hook | 同上 | ★ 实测 |
| 46 | `i18n/locales/en.ts` / `zh-CN.ts` | 无 | 新增 135 条译文：82 条命令（label+desc）、7 个分组名、53 个参数字段、其余面板文案 | 中文按 MAVLink/ArduPilot 惯例译（如 Loiter→盘旋、ROI→兴趣点、Acceptance Radius→到点判定半径） | ○ 术语判断，**需你审校** |
| 47 | **修复自己引入的缺陷** | 我用脚本自动给嵌套组件补 hook 时，把 `useTranslation` 插进了 `ensureFlightInfoPanel` / `createDefaultLayout` 两个**普通函数** | 改为 `t: TFunction` 参数注入（4 个调用点补实参）；另给 4 个 effect/callback 的依赖数组补 `t` | ★ **`eslint` 的 `react-hooks/rules-of-hooks` 报了 2 个 error**，是本次唯一的真错误；依赖数组缺失会导致切语言后面板标题不刷新 | ★ 实测：修复后 0 error |

### 本轮验证证据（★ 全部实测）

| 验证项 | 结果 |
|---|---|
| `tsc --noEmit` | 仅剩既有 1 条 `src/main/index.ts(325) app.dock` |
| `turbo run build --filter=@ardudeck/desktop` | 10/10 成功 |
| `vitest run --root apps/desktop` | **281/281 文件、3005 通过、0 失败**（含 `WaypointTablePanel.command-params.test.ts`） |
| `eslint`（mission 目录） | **0 error / 3 warning**，3 条 warning 已用 `git stash` 在**基线**上复现同样 3 条，证明为既有问题 |
| 产物校验 | bundle 中 `起飞`×7、`盘旋`×5、`兴趣点`×7、`云台`×6、`导航`、`条件`、`相机`×17、`到点判定半径`、`任务地图`、`高度剖面` 均可检索 |
| mission 扫描 | **290 → 1**（剩 `iNav 2.6.1` 版本号） |

## 六、扫描器已知边界（避免过度解读）

`node tools/i18n-scan.mjs` 当前报告：扫描 834 个文件、**约 4700 条**（口径见第四节）。已覆盖：单行 JSX 文本节点、`aria-label`/`placeholder`/`title`/`alt`、8 种属性的对象字面量。**未覆盖**：

- `{}` 表达式内的字符串、跨行文本块、模板字符串内英文
- `strong`/`em` 嵌套句中的片段（第 29 条对 "Advanced map commands" 采用了拆片段翻译，**中文语序可能不自然，需你审校**）
- 主进程文案（菜单、对话框、托盘）——范围仅渲染层
- 由 store 生成的文案（见第七节第 6 条）

已修正的误报/漏检（均经实测）：① TS 泛型 `<Promise<string>>` 曾被当作 JSX 文本，产生 250 次误报；② 早期实现会删掉带属性开标签，导致设置页 87 条被漏检成 0 条；③ 行内 `/> text</span>` 形式曾被漏检（第四轮发现并补上）。

## 七、遗留与待决策

1. **未翻译范围（新口径 Top）**：`lua-graph/graph-templates.ts` 372、`lua-graph/node-library.ts` 268、`mission/WaypointTablePanel.tsx` 215、`mavlink-config/FlightModesTab.tsx` 135、`mavlink-config/presets/mavlink-presets.ts` 130、`parameters/MspConfigView.tsx` 127。其中带 `_templates`/`_library`/`presets` 的文件是**数据定义文件**，翻译需改数据模型（把 `label:` 换成 `labelKey:`），工作量与非数据文件不同。要继续翻哪一块，说范围即可。
2. **锁文件不一致（需要你决定）**：你的全局 `~/.npmrc` 里有 `lockfile=false`，因此 `pnpm install` **不会更新** `pnpm-lock.yaml`。`apps/desktop/package.json` 已加 `i18next`/`react-i18next`，但 lock 的 `apps/desktop` importer 段里没有它们。CI（`.github/workflows/*.yml`）用裸 `pnpm install`，**不会因此失败**；任何 `--frozen-lockfile` 用法会失败。修法需显式 `pnpm install --lockfile=true`（会改写锁文件）；**未经许可我没有动它**。
3. **截图证据（状态更新）**：第二轮时确实缺截图。第三轮补上了**间接但更硬**的证据——切换语言写盘成功（`settings.json` 出现 `"language": "zh-CN"`，见下条），说明用户在下拉里选中并持久化成功。但**仍然没有截图**：沙箱把应用与探测脚本切成两个进程组，每次工具调用结束即回收，MCP 长调用（`get_page_state`）只成功过一次就超时。
4. **`~/.config/@ardudeck` 仍读不到**：在 DSH 沙箱内用真实家目录启动会撞 `EROFS: .../modules.json.tmp-...`（沙箱拒写）。要持久化到你的真实配置，需在你自己终端里跑 `.run/run-for-user.sh`。
5. **术语待审（○ 判断，非官方术语表）**：载具(Vehicle)、任务(Mission)、配置(Configuration)、遥测(Telemetry)、任务库(Mission Library)、机队仓库(Fleet Vault)、天气简报(Weather Briefing)、教练模式(Trainer)、伴飞计算机(Companion Computer)、货舱(Cargo) 等。请确认或给出术语表。
6. **含变量的句子未逐句本地化**：`SecureLinkCompliance` 的三态文案、`ProfileApplyOverlay` 的 toast、`SnapshotList` 的 `${reason}` 等由 store 生成；要彻底本地化需把 store 内文案也纳入 i18n（属新范围，需你批准）。


