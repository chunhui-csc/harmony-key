// ============================================================
// 语和 HarmonyKey — 全局类型定义
// ============================================================

/** 敏感词匹配结果 */
export interface SensitiveMatch {
  /** 匹配到的敏感词 */
  word: string;
  /** 在输入文本中的起始位置 */
  startIndex: number;
  /** 在输入文本中的结束位置 */
  endIndex: number;
  /** 敏感等级: low | medium | high */
  severity: 'low' | 'medium' | 'high';
  /** 分类: insult | hate | aggressive | vulgar */
  category: SensitiveCategory;
}

/** 敏感词分类 */
export type SensitiveCategory = 'insult' | 'hate' | 'aggressive' | 'vulgar' | 'other';

/** 本地情绪分析结果 */
export interface EmotionAnalysis {
  /** 情绪标签 */
  emotion: EmotionLabel;
  /** 置信度 0-1 */
  confidence: number;
  /** 检测到的敏感词列表 */
  sensitiveMatches: SensitiveMatch[];
  /** 整体攻击性评分 0-1 */
  aggressionScore: number;
}

/** 情绪标签 */
export type EmotionLabel = 'neutral' | 'angry' | 'sad' | 'anxious' | 'positive' | 'aggressive';

/** 改写建议 */
export interface RewriteSuggestion {
  /** 改写后的文本 */
  text: string;
  /** 改写策略: soften | humor | assertive | formal */
  strategy: RewriteStrategy;
  /** 改写说明 */
  description: string;
}

/** 改写策略 */
export type RewriteStrategy = 'soften' | 'humor' | 'assertive' | 'formal';

/** SSE 流式改写事件 */
export interface SSERewriteEvent {
  type: 'token' | 'done' | 'error';
  /** 增量 token */
  token?: string;
  /** 完整的改写建议列表（done 时返回） */
  suggestions?: RewriteSuggestion[];
  /** 错误信息 */
  error?: string;
}

// ============================================================
// 扩展消息协议（Service Worker <-> Content Script <-> Popup）
// ============================================================

export type ExtensionMessage =
  | { type: 'ANALYZE_TEXT'; payload: { text: string; url: string } }
  | { type: 'ANALYSIS_RESULT'; payload: EmotionAnalysis }
  | { type: 'REQUEST_REWRITE'; payload: { text: string; strategy?: RewriteStrategy } }
  | { type: 'REWRITE_RESULT'; payload: { original: string; suggestions: RewriteSuggestion[] } }
  | { type: 'REWRITE_STREAM_TOKEN'; payload: { token: string; suggestionIndex: number } }
  | { type: 'REWRITE_STREAM_DONE'; payload: { suggestions: RewriteSuggestion[] } }
  | { type: 'REWRITE_STREAM_ERROR'; payload: { error: string } }
  | { type: 'GET_STATS' }
  | { type: 'STATS_RESULT'; payload: DashboardStats }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'SETTINGS_UPDATED'; payload: UserSettings }
  | { type: 'SHOW_SUGGESTION_BUBBLE'; payload: { matches: SensitiveMatch[]; originalText: string } }
  | { type: 'APPLY_REWRITE'; payload: { text: string } }
  | { type: 'DISMISS_BUBBLE' };

// ============================================================
// 业务类型
// ============================================================

/** 情绪仪表盘统计数据 */
export interface DashboardStats {
  /** 总监听次数 */
  totalMonitors: number;
  /** 触发警示次数 */
  alertsTriggered: number;
  /** 用户采纳改写建议次数 */
  rewritesApplied: number;
  /** 今日情绪分布 */
  emotionDistribution: Record<EmotionLabel, number>;
  /** 连续温和表达天数 */
  calmStreak: number;
}

/** 用户设置 */
export interface UserSettings {
  /** 是否启用插件 */
  enabled: boolean;
  /** 敏感度阈值: low | medium | high */
  sensitivity: 'low' | 'medium' | 'high';
  /** 是否在工作模式（更严格） */
  workMode: boolean;
  /** 是否在游戏模式（更宽松） */
  gameMode: boolean;
  /** 是否自动替换（不询问） */
  autoReplace: boolean;
  /** 防抖延迟 ms，默认 500 */
  debounceMs: number;
  /** 是否启用情绪仪表盘 */
  dashboardEnabled: boolean;
}

/** 默认用户设置 */
export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  sensitivity: 'medium',
  workMode: false,
  gameMode: false,
  autoReplace: false,
  debounceMs: 500,
  dashboardEnabled: true,
};
