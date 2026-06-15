// ============================================================
// 语和 HarmonyKey — Aho-Corasick 算法单元测试
// ============================================================

import { AhoCorasick } from '../src/shared/aho-corasick';

describe('AhoCorasick', () => {
  let ac: AhoCorasick;

  beforeEach(() => {
    ac = new AhoCorasick();
  });

  describe('基础功能', () => {
    it('应正确匹配单个模式', () => {
      ac.addPattern('test');
      ac.buildFailureLinks();

      const results = ac.search('this is a test string');
      expect(results).toHaveLength(1);
      expect(results[0].patternIndex).toBe(0);
      // "test" ends at index 14 (0-based: t=10, e=11, s=12, t=13 → endIndex=13)
      expect(results[0].endIndex).toBe(13);
    });

    it('应正确匹配多个模式', () => {
      ac.addPatterns(['傻逼', '白痴', '垃圾']);
      ac.buildFailureLinks();

      const results = ac.search('你这个傻逼，真是个白痴');
      expect(results).toHaveLength(2);
      expect(ac.getPattern(results[0].patternIndex)).toBe('傻逼');
      expect(ac.getPattern(results[1].patternIndex)).toBe('白痴');
    });

    it('应正确匹配重叠的模式', () => {
      ac.addPatterns(['ab', 'bc', 'abc']);
      ac.buildFailureLinks();

      const results = ac.search('abc');
      // 应匹配到 "ab", "abc", "bc"
      expect(results.length).toBeGreaterThanOrEqual(2);
      const matchedWords = results.map((r) => ac.getPattern(r.patternIndex));
      expect(matchedWords).toContain('ab');
      expect(matchedWords).toContain('abc');
    });

    it('无匹配时应返回空数组', () => {
      ac.addPatterns(['傻逼', '垃圾']);
      ac.buildFailureLinks();

      const results = ac.search('今天天气真好');
      expect(results).toHaveLength(0);
    });

    it('空文本应返回空数组', () => {
      ac.addPattern('test');
      ac.buildFailureLinks();

      const results = ac.search('');
      expect(results).toHaveLength(0);
    });
  });

  describe('中英文混合', () => {
    it('应正确匹配中文敏感词', () => {
      ac.addPatterns(['他妈', '特么', '卧槽']);
      ac.buildFailureLinks();

      const results = ac.search('你他妈的什么意思');
      expect(results).toHaveLength(1);
      expect(ac.getPattern(results[0].patternIndex)).toBe('他妈');
    });

    it('应正确匹配英文敏感词', () => {
      ac.addPatterns(['fuck', 'shit', 'damn']);
      ac.buildFailureLinks();

      const results = ac.search('what the fuck is this shit');
      expect(results).toHaveLength(2);
      expect(ac.getPattern(results[0].patternIndex)).toBe('fuck');
      expect(ac.getPattern(results[1].patternIndex)).toBe('shit');
    });

    it('应正确匹配中英文混合文本', () => {
      ac.addPatterns(['傻逼', 'fuck', '垃圾']);
      ac.buildFailureLinks();

      const results = ac.search('你是个傻逼，what the fuck，垃圾东西');
      expect(results).toHaveLength(3);
    });
  });

  describe('边界情况', () => {
    it('reset 后应清空所有模式', () => {
      ac.addPattern('test');
      ac.buildFailureLinks();
      expect(ac.patternCount).toBe(1);

      ac.reset();
      expect(ac.patternCount).toBe(0);

      const results = ac.search('test');
      expect(results).toHaveLength(0);
    });

    it('应正确处理大量模式', () => {
      // 使用不含子串关系的模式，避免 word4 匹配到 word42
      const words = Array.from({ length: 100 }, (_, i) => `w${i}x`);
      ac.addPatterns(words);
      ac.buildFailureLinks();

      const results = ac.search('this contains w42x and w99x');
      expect(results).toHaveLength(2);
    });

    it('应正确处理特殊字符', () => {
      ac.addPatterns(['***', '$$$']);
      ac.buildFailureLinks();

      const results = ac.search('this is *** and $$$');
      expect(results).toHaveLength(2);
    });
  });
});
