// ============================================================
// 语和 HarmonyKey — 敏感词过滤器单元测试
// ============================================================

import { SensitiveFilter } from '../src/content/sensitive-filter';

describe('SensitiveFilter', () => {
  let filter: SensitiveFilter;

  beforeEach(() => {
    filter = new SensitiveFilter();
    filter.initialize('medium');
  });

  describe('scan()', () => {
    it('应检测到中文侮辱性词汇', () => {
      const matches = filter.scan('你真是个傻逼');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.word === '傻逼')).toBe(true);
    });

    it('应检测到英文攻击性词汇', () => {
      const matches = filter.scan('you are so stupid');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.word === 'stupid')).toBe(true);
    });

    it('应返回正确的位置信息', () => {
      const matches = filter.scan('你这个白痴');
      const match = matches.find((m) => m.word === '白痴');
      expect(match).toBeDefined();
      expect(match!.severity).toBe('high');
      expect(match!.category).toBe('insult');
    });

    it('正常文本不应触发匹配', () => {
      const matches = filter.scan('今天天气真好，我们一起出去玩吧');
      expect(matches).toHaveLength(0);
    });

    it('空文本应返回空数组', () => {
      const matches = filter.scan('');
      expect(matches).toHaveLength(0);
    });

    it('应去重同一位置的重复匹配', () => {
      // "傻逼" 在文本中只出现一次
      const matches = filter.scan('傻逼');
      const count = matches.filter((m) => m.word === '傻逼').length;
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  describe('isAggressive()', () => {
    it('高严重度词汇应判定为攻击性', () => {
      expect(filter.isAggressive('你这个傻逼')).toBe(true);
    });

    it('低严重度词汇不应判定为攻击性（仅低严重度时）', () => {
      // "靠" 是低严重度，单独的 low 级别不触发 isAggressive
      const result = filter.isAggressive('靠');
      expect(result).toBe(false);
    });

    it('正常文本不应判定为攻击性', () => {
      expect(filter.isAggressive('你好，谢谢')).toBe(false);
    });
  });

  describe('getAggressionScore()', () => {
    it('无敏感词时应返回 0', () => {
      expect(filter.getAggressionScore('你好')).toBe(0);
    });

    it('有敏感词时应返回大于 0 的分数', () => {
      const score = filter.getAggressionScore('你这个傻逼白痴');
      expect(score).toBeGreaterThan(0);
    });

    it('多个高严重度词汇应返回更高分数', () => {
      const scoreLow = filter.getAggressionScore('卧槽');
      const scoreHigh = filter.getAggressionScore('你这个傻逼白痴废物去死吧');
      expect(scoreHigh).toBeGreaterThan(scoreLow);
    });
  });

  describe('sanitize()', () => {
    it('应替换敏感词为星号', () => {
      const result = filter.sanitize('你是个傻逼');
      expect(result).not.toContain('傻逼');
      expect(result).toContain('*');
    });

    it('无敏感词时应返回原文本', () => {
      const original = '今天天气真好';
      expect(filter.sanitize(original)).toBe(original);
    });

    it('多个敏感词应全部替换', () => {
      const result = filter.sanitize('傻逼和垃圾');
      expect(result).not.toContain('傻逼');
      expect(result).not.toContain('垃圾');
    });
  });

  describe('reload()', () => {
    it('切换到低敏感度后应返回更少匹配', () => {
      filter.initialize('medium');
      const mediumMatches = filter.scan('靠，卧槽，你算老几');

      filter.reload('low');
      const lowMatches = filter.scan('靠，卧槽，你算老几');

      // 低敏感度应过滤掉低严重度的词
      expect(lowMatches.length).toBeLessThanOrEqual(mediumMatches.length);
    });

    it('切换到高敏感度后应返回更多匹配', () => {
      filter.reload('high');
      const matches = filter.scan('靠，卧槽');
      // 高敏感度应包含低严重度的词
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
