// ============================================================
// 语和 HarmonyKey — 敏感词词典（P0 原型版）
// 隐私优先：该词典完全在本地内存中运行，绝不上传
// ============================================================

import type { SensitiveCategory } from '../types';

export interface SensitiveWordEntry {
  word: string;
  severity: 'low' | 'medium' | 'high';
  category: SensitiveCategory;
}

/**
 * P0 原型敏感词库
 * 正式版将扩展至完整词库，并支持用户自定义
 */
export const SENSITIVE_WORDS: SensitiveWordEntry[] = [
  // === 侮辱类 (insult) ===
  { word: '傻逼', severity: 'high', category: 'insult' },
  { word: '蠢货', severity: 'high', category: 'insult' },
  { word: '白痴', severity: 'high', category: 'insult' },
  { word: '弱智', severity: 'high', category: 'insult' },
  { word: '脑残', severity: 'high', category: 'insult' },
  { word: '废物', severity: 'high', category: 'insult' },
  { word: 'loser', severity: 'medium', category: 'insult' },
  { word: 'idiot', severity: 'medium', category: 'insult' },
  { word: 'stupid', severity: 'medium', category: 'insult' },
  { word: 'dumb', severity: 'medium', category: 'insult' },

  // === 仇恨类 (hate) ===
  { word: '去死', severity: 'high', category: 'hate' },
  { word: '恶心', severity: 'medium', category: 'hate' },
  { word: '垃圾', severity: 'medium', category: 'hate' },
  { word: '滚', severity: 'medium', category: 'hate' },
  { word: 'hate', severity: 'medium', category: 'hate' },

  // === 攻击性 (aggressive) ===
  { word: '闭嘴', severity: 'low', category: 'aggressive' },
  { word: '你懂什么', severity: 'low', category: 'aggressive' },
  { word: '你算老几', severity: 'medium', category: 'aggressive' },
  { word: '管好你自己', severity: 'low', category: 'aggressive' },
  { word: 'shut up', severity: 'low', category: 'aggressive' },

  // === 粗俗类 (vulgar) ===
  { word: '他妈', severity: 'medium', category: 'vulgar' },
  { word: '特么', severity: 'medium', category: 'vulgar' },
  { word: '靠', severity: 'low', category: 'vulgar' },
  { word: '卧槽', severity: 'low', category: 'vulgar' },
  { word: 'fuck', severity: 'high', category: 'vulgar' },
  { word: 'shit', severity: 'medium', category: 'vulgar' },
  { word: 'damn', severity: 'low', category: 'vulgar' },
];

/**
 * 根据敏感度阈值过滤敏感词列表
 */
/**
 * 根据用户设置的敏感度等级过滤敏感词列表
 *
 * 敏感度语义：
 * - low: 低敏感（仅检测高严重度词汇：侮辱、仇恨类）
 * - medium: 标准（检测中、高严重度词汇，默认推荐）
 * - high: 高敏感（检测所有词汇，包括低严重度的粗俗/攻击性）
 */
export function filterBySensitivity(
  sensitivity: 'low' | 'medium' | 'high'
): SensitiveWordEntry[] {
  const severityRank = { low: 1, medium: 2, high: 3 };
  // 敏感度越低 → 阈值越高，只保留严重度 >= 阈值的词
  const thresholdMap = { low: 3, medium: 2, high: 1 };
  const threshold = thresholdMap[sensitivity];
  return SENSITIVE_WORDS.filter(
    (entry) => severityRank[entry.severity] >= threshold
  );
}
