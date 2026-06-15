// ============================================================
// 语和 HarmonyKey — Aho-Corasick 多模式匹配算法实现
// 用于本地敏感词的快速过滤（第一层检测）
// 时间复杂度：O(n + m)，其中 n = 文本长度，m = 匹配总数
// 空间复杂度：O(L * Σ)，L = 所有模式总长度，Σ = 字符集大小
// ============================================================

interface TrieNode {
  /** 子节点映射：字符 -> 节点索引 */
  children: Map<string, number>;
  /** failure 链接索引 */
  fail: number;
  /** 输出：匹配到的模式在 patterns 数组中的索引列表 */
  output: number[];
}

/**
 * Aho-Corasick 自动机
 * 支持批量多模式匹配，适合敏感词扫描场景
 */
export class AhoCorasick {
  private nodes: TrieNode[];
  private patterns: string[];

  constructor() {
    this.nodes = [{ children: new Map(), fail: 0, output: [] }];
    this.patterns = [];
  }

  /**
   * 添加一个模式串
   */
  addPattern(pattern: string): void {
    this.patterns.push(pattern);
    let current = 0;

    for (const ch of pattern) {
      if (!this.nodes[current].children.has(ch)) {
        this.nodes[current].children.set(ch, this.nodes.length);
        this.nodes.push({ children: new Map(), fail: 0, output: [] });
      }
      current = this.nodes[current].children.get(ch)!;
    }

    // 在终止节点记录该模式的索引
    this.nodes[current].output.push(this.patterns.length - 1);
  }

  /**
   * 批量添加模式串
   */
  addPatterns(patterns: string[]): void {
    for (const p of patterns) {
      this.addPattern(p);
    }
  }

  /**
   * 构建 failure 链接（BFS）
   * 必须在所有模式添加完毕后调用
   */
  buildFailureLinks(): void {
    const queue: number[] = [];

    // 初始化：根节点的直接子节点的 fail 指向根
    for (const [, childIdx] of this.nodes[0].children) {
      this.nodes[childIdx].fail = 0;
      queue.push(childIdx);
    }

    // BFS 构建失败链接
    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const [ch, childIdx] of this.nodes[current].children) {
        queue.push(childIdx);

        // 沿 fail 链寻找最长后缀
        let failState = this.nodes[current].fail;
        while (failState !== 0 && !this.nodes[failState].children.has(ch)) {
          failState = this.nodes[failState].fail;
        }

        if (this.nodes[failState].children.has(ch)) {
          failState = this.nodes[failState].children.get(ch)!;
        }

        this.nodes[childIdx].fail = failState;

        // 合并 output（关键步骤：继承 fail 节点的输出）
        this.nodes[childIdx].output = [
          ...this.nodes[childIdx].output,
          ...this.nodes[failState].output,
        ];
      }
    }
  }

  /**
   * 在文本中搜索所有匹配的模式
   * @returns 匹配结果：[{ patternIndex, endIndex }]
   */
  search(text: string): Array<{ patternIndex: number; endIndex: number }> {
    const results: Array<{ patternIndex: number; endIndex: number }> = [];
    let current = 0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // 沿 fail 链找到匹配的状态
      while (current !== 0 && !this.nodes[current].children.has(ch)) {
        current = this.nodes[current].fail;
      }

      if (this.nodes[current].children.has(ch)) {
        current = this.nodes[current].children.get(ch)!;
      }

      // 收集所有输出
      for (const patternIndex of this.nodes[current].output) {
        const pattern = this.patterns[patternIndex];
        results.push({
          patternIndex,
          endIndex: i,
        });
      }
    }

    return results;
  }

  /**
   * 获取模式串
   */
  getPattern(index: number): string {
    return this.patterns[index];
  }

  /**
   * 获取模式总数
   */
  get patternCount(): number {
    return this.patterns.length;
  }

  /**
   * 重置自动机（清空所有模式）
   */
  reset(): void {
    this.nodes = [{ children: new Map(), fail: 0, output: [] }];
    this.patterns = [];
  }
}
