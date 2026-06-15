// ============================================================
// 语和 HarmonyKey — 敏感词过滤器
// 基于 Aho-Corasick 自动机，在本地内存中完成（隐私优先）
// ============================================================

import { AhoCorasick } from '../shared/aho-corasick';
import { SENSITIVE_WORDS, filterBySensitivity } from '../shared/sensitive-words';
import type { SensitiveMatch, SensitiveCategory } from '../types';

/**
 * 敏感词过滤器（单例模式）
 * 维护一个初始化好的 Aho-Corasick 自动机实例
 */
export class SensitiveFilter {
  private automaton: AhoCorasick;
  private wordMap: Map<number, (typeof SENSITIVE_WORDS)[number]>;
  private initialized: boolean = false;

  constructor() {
    this.automaton = new AhoCorasick();
    this.wordMap = new Map();
  }

  /**
   * 初始化自动机（构建 trie + failure links）
   * @param sensitivity 敏感度阈值
   */
  initialize(sensitivity: 'low' | 'medium' | 'high' = 'medium'): void {
    const words = filterBySensitivity(sensitivity);

    this.automaton.reset();
    this.wordMap.clear();

    for (let i = 0; i < words.length; i++) {
      this.automaton.addPattern(words[i].word);
      this.wordMap.set(i, words[i]);
    }

    this.automaton.buildFailureLinks();
    this.initialized = true;
  }

  /**
   * 扫描文本，返回所有匹配到的敏感词
   * @param text 待检测文本
   * @returns 敏感词匹配结果列表
   */
  scan(text: string): SensitiveMatch[] {
    if (!this.initialized) {
      console.warn('[HarmonyKey] SensitiveFilter 未初始化，自动使用默认敏感度');
      this.initialize('medium');
    }

    if (!text || text.trim().length === 0) {
      return [];
    }

    const rawMatches = this.automaton.search(text);
    const matches: SensitiveMatch[] = [];

    for (const match of rawMatches) {
      const entry = this.wordMap.get(match.patternIndex);
      if (!entry) continue;

      const word = entry.word;
      const startIndex = match.endIndex - word.length + 1;

      // 去重：同一位置的同一模式只保留一次
      const isDuplicate = matches.some(
        (m) => m.word === word && m.startIndex === startIndex
      );
      if (isDuplicate) continue;

      matches.push({
        word,
        startIndex,
        endIndex: match.endIndex,
        severity: entry.severity,
        category: entry.category,
      });
    }

    // 按出现位置排序
    matches.sort((a, b) => a.startIndex - b.startIndex);
    return matches;
  }

  /**
   * 检查文本是否包含攻击性内容
   */
  isAggressive(text: string): boolean {
    const matches = this.scan(text);
    return matches.some(
      (m) => m.severity === 'high' || m.category === 'hate' || m.category === 'insult'
    );
  }

  /**
   * 计算攻击性评分 0-1
   */
  getAggressionScore(text: string): number {
    const matches = this.scan(text);
    if (matches.length === 0) return 0;

    const severityWeights = { low: 0.3, medium: 0.6, high: 1.0 };
    let totalWeight = 0;

    for (const match of matches) {
      totalWeight += severityWeights[match.severity];
    }

    // 归一化：匹配数越多、越严重，分数越高
    const score = Math.min(1.0, totalWeight / Math.max(text.length / 10, 1));
    return Math.round(score * 100) / 100;
  }

  /**
   * 本地执行简单替换（将敏感词替换为 **）
   * 注：P0 原型阶段使用简单打码，后续版本将接入 AI 改写
   */
  sanitize(text: string): string {
    const matches = this.scan(text);
    if (matches.length === 0) return text;

    // 从后往前替换，避免索引偏移
    let result = text;
    const sorted = [...matches].sort((a, b) => b.startIndex - a.startIndex);

    for (const match of sorted) {
      const before = result.substring(0, match.startIndex);
      const after = result.substring(match.endIndex + 1);
      result = before + '*'.repeat(match.word.length) + after;
    }

    return result;
  }

  /**
   * 重新加载敏感度设置
   */
  reload(sensitivity: 'low' | 'medium' | 'high'): void {
    this.initialize(sensitivity);
  }
}

/** 全局单例 */
export const sensitiveFilter = new SensitiveFilter();
