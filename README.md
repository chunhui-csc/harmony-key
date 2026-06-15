# 语和 HarmonyKey

> 智能网络社交情绪辅助插件 — 实时情绪缓冲与表达优化

## 项目概述

语和 (HarmonyKey) 是一款浏览器插件，旨在通过 AI 技术在用户输入端提供实时的"情绪缓冲"与"表达优化"，降低网络冲突。当用户在社交平台（微信/QQ 网页版、微博、论坛等）输入文本时，插件自动检测攻击性表达并提供温和的改写建议。

## 技术架构

```
┌─────────────────────────────────────────────┐
│                  Browser Extension           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Popup   │  │ Content  │  │ Background │  │
│  │ (React)  │  │  Script  │  │  Service   │  │
│  │          │  │          │  │  Worker    │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │             │              │         │
│  ┌────┴─────────────┴──────────────┴──────┐  │
│  │         Message Bus (chrome.runtime)    │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌──────────────────────────────────────┐     │
│  │  Layer 1: Aho-Corasick (本地敏感词)   │     │
│  │  Layer 2: ONNX BERT (本地情绪分类)    │     │
│  │  Layer 3: Qwen/GLM API (云端改写)     │     │
│  └──────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

## 处理流水线

1. **输入层** — DOM 事件监听（input 冒泡），500ms 防抖
2. **第一层（本地）** — Aho-Corasick 多模式匹配，敏感词快速过滤
3. **第二层（本地）** — ONNX Runtime + BERT 情绪分类（P1 阶段）
4. **第三层（云端）** — Qwen/GLM API + SSE 流式改写（P1 阶段）
5. **展示层** — 建议气泡（橙色→红色渐变警示）+ 温和表达替换

## 目录结构

```
yuhe/
├── manifest.json                 # Chrome Extension Manifest V3
├── package.json
├── tsconfig.json
├── webpack.config.js
├── jest.config.js
├── public/
│   └── icons/                    # 扩展图标
├── src/
│   ├── background/
│   │   └── index.ts              # Service Worker
│   ├── content/
│   │   ├── index.ts              # Content Script 入口
│   │   ├── input-monitor.ts      # 输入监听器（500ms 防抖）
│   │   ├── sensitive-filter.ts   # 敏感词过滤器
│   │   ├── suggestion-bubble.ts  # 建议气泡 UI
│   │   └── content.css           # Content Script 样式
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── EmotionDashboard.tsx
│   │   │   ├── RewriteSuggestion.tsx
│   │   │   └── Settings.tsx
│   │   └── styles/
│   │       └── popup.css
│   ├── shared/
│   │   ├── aho-corasick.ts       # Aho-Corasick 算法实现
│   │   ├── sensitive-words.ts    # 敏感词词典
│   │   └── messages.ts           # 消息协议 & 工具函数
│   └── types/
│       └── index.ts              # 全局类型定义
├── tests/
│   ├── aho-corasick.test.ts
│   ├── sensitive-filter.test.ts
│   └── input-monitor.test.ts
└── README.md
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 构建

```bash
# 开发模式（watch）
npm run dev

# 生产构建
npm run build
```

### 测试

```bash
npm test
```

### 加载扩展

1. 打开 Chrome/Edge，导航至 `chrome://extensions`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `dist/` 目录

## 隐私与合规

- ✅ **全内存处理**：聊天内容仅在内存中分析，绝不缓存或上传
- ✅ **最小数据原则**：仅提取当前输入框文本片段，不读取聊天历史
- ✅ **非侵入式 DOM 监听**：使用标准 DOM 事件，不 Hook/注入目标应用内存
- ✅ **本地优先**：敏感词匹配完全在本地完成
- ✅ **合规兼容**：遵循微信/QQ 平台开发协议，避免封号风险

## 开发路线图

| 阶段 | 周期 | 里程碑 |
|------|------|--------|
| **P0: 原型验证** | 1 个月 | 浏览器扩展 MVP，本地敏感词匹配 + 本地替换 |
| P1: AI 接入 | 2 个月 | Qwen API 流式改写，ONNX BERT 情绪分类 |
| P2: 移动端 | 3 个月 | Android 自定义输入法，iOS 键盘扩展 |
| P3: 生态化 | 持续 | 用户画像、「温和度」评分模型 |

## 许可

Apache-2.0 License
