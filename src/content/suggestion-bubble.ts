// ============================================================
// 语和 HarmonyKey — 改写建议气泡 UI (Content Script)
// 在输入框附近显示情绪警示和改写建议
//
// 视觉规范（SRS 3.3）：
// - 温和式提醒：橙色 -> 红色渐变（从温和到严重）
// - 颜色语义：橙（温和警示）-> 红（严重警示）-> 绿（建议采纳）
// ============================================================

import type { SensitiveMatch } from '../types';

interface BubbleOptions {
  matches: SensitiveMatch[];
  originalText: string;
  onApplyRewrite: (text: string) => void;
  onDismiss: () => void;
  anchorElement: HTMLElement;
}

/**
 * 建议气泡 UI 组件
 *
 * 设计要点：
 * - 非侵入式：DOM 注入于页面边缘，不影响原始页面布局
 * - 即时反馈：匹配到敏感词后立即展示
 * - 可关闭：用户可一键忽略
 */
export class SuggestionBubble {
  private container: HTMLDivElement | null = null;
  private isVisible: boolean = false;

  /**
   * 显示建议气泡
   */
  show(opts: BubbleOptions): void {
    // 如果已存在，先移除
    if (this.container) {
      this.destroy();
    }

    const { matches, originalText, onApplyRewrite, onDismiss, anchorElement } = opts;

    // 创建气泡容器
    this.container = this.createContainer(anchorElement);
    this.container.innerHTML = this.buildHTML(matches, originalText);

    // 绑定按钮事件（innerHTML 不会自动绑定）
    const applyBtn = this.container.querySelector('#harmonykey-apply-btn');
    const dismissBtn = this.container.querySelector('#harmonykey-dismiss-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => onApplyRewrite(this.getSanitizedText(originalText, matches)));
    }
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => onDismiss());
    }

    // 挂到 <html> 根元素，避免 body 上的 overflow/transform 影响 fixed 定位
    (document.documentElement || document.body).appendChild(this.container);
    this.isVisible = true;

    // 5 秒后自动淡出（非阻塞，用户仍可交互）
    this.scheduleAutoFade();
  }

  /**
   * 隐藏气泡
   */
  hide(): void {
    if (this.container) {
      this.container.style.opacity = '0';
      this.container.style.transition = 'opacity 0.3s ease';
      setTimeout(() => this.destroy(), 300);
    }
    this.isVisible = false;
  }

  /**
   * 销毁气泡 DOM
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.isVisible = false;
  }

  // ---- 私有方法 ----

  private createContainer(anchorElement: HTMLElement): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'harmonykey-suggestion-bubble';
    container.className = 'harmonykey-bubble';

    // 计算最佳位置（视口边界检测）
    const rect = anchorElement.getBoundingClientRect();
    const bubbleWidth = 340;
    const bubbleMaxHeight = 220;
    const gap = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // 水平：居中于输入框，但不超出视口
    let left = rect.left + rect.width / 2 - bubbleWidth / 2;
    left = Math.max(10, Math.min(left, viewportW - bubbleWidth - 10));

    // 垂直：优先放下面，空间不够则放上面
    const spaceBelow = viewportH - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    let top: number;
    let showBelow: boolean;

    if (spaceBelow >= bubbleMaxHeight || spaceBelow >= spaceAbove) {
      // 放输入框下方
      top = rect.bottom + gap;
      showBelow = true;
    } else {
      // 放输入框上方
      top = rect.top - gap; // 底部对齐用 CSS transform
      showBelow = false;
    }

    // 确保不超出视口顶部
    if (!showBelow && top < bubbleMaxHeight) {
      top = Math.max(10, rect.bottom + gap);
      showBelow = true;
    }

    container.style.cssText = `
      position: fixed;
      left: ${left}px;
      ${showBelow ? `top: ${top}px;` : `bottom: ${viewportH - top}px;`}
      width: ${bubbleWidth}px;
      max-height: ${bubbleMaxHeight}px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
      padding: 16px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      overflow-y: auto;
      animation: harmonykey-fadeIn 0.3s ease;
    `;

    // 注入动画样式（只注入一次）
    if (!document.getElementById('harmonykey-styles')) {
      const style = document.createElement('style');
      style.id = 'harmonykey-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }

    return container;
  }

  private buildHTML(
    matches: SensitiveMatch[],
    originalText: string
  ): string {
    const severityColor = this.getSeverityColor(matches);
    const sanitized = this.getSanitizedText(originalText, matches);
    const categoryLabels: Record<string, string> = {
      insult: '侮辱',
      hate: '仇恨',
      aggressive: '攻击性',
      vulgar: '粗俗',
      other: '其他',
    };

    const matchTags = matches
      .map(
        (m) =>
          `<span class="harmonykey-tag harmonykey-tag--${m.severity}">${
            categoryLabels[m.category] || m.category
          }</span>`
      )
      .join('');

    return `
      <div class="harmonykey-bubble__header">
        <div class="harmonykey-bubble__icon" style="background:${severityColor}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <span class="harmonykey-bubble__title">语和 · 情绪提示</span>
      </div>
      <div class="harmonykey-bubble__body">
        <p class="harmonykey-bubble__hint">检测到以下类型的表达，建议温和表达：</p>
        <div class="harmonykey-bubble__tags">${matchTags}</div>
        <div class="harmonykey-bubble__preview">
          <div class="harmonykey-bubble__preview-label">建议改写预览：</div>
          <div class="harmonykey-bubble__preview-text">${this.escapeHtml(sanitized)}</div>
        </div>
      </div>
      <div class="harmonykey-bubble__actions">
        <button class="harmonykey-btn harmonykey-btn--apply" id="harmonykey-apply-btn">
          ✓ 使用温和表达
        </button>
        <button class="harmonykey-btn harmonykey-btn--dismiss" id="harmonykey-dismiss-btn">
          忽略
        </button>
      </div>
    `;
  }

  private getSeverityColor(matches: SensitiveMatch[]): string {
    const hasHigh = matches.some((m) => m.severity === 'high');
    const hasMedium = matches.some((m) => m.severity === 'medium');
    if (hasHigh) return '#e74c3c';   // 红色 — 严重警示
    if (hasMedium) return '#f39c12'; // 橙色 — 温和提醒
    return '#f1c40f';                // 黄色 — 轻微提醒
  }

  private getSanitizedText(text: string, matches: SensitiveMatch[]): string {
    let result = text;
    const sorted = [...matches].sort((a, b) => b.startIndex - a.startIndex);
    for (const match of sorted) {
      const before = result.substring(0, match.startIndex);
      const after = result.substring(match.endIndex + 1);
      result = before + '*'.repeat(match.word.length) + after;
    }
    return result;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private scheduleAutoFade(): void {
    setTimeout(() => {
      if (this.isVisible && this.container) {
        this.container.style.opacity = '0.5';
      }
    }, 5000);
  }

  private getStyles(): string {
    return `
      @keyframes harmonykey-fadeIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .harmonykey-bubble__header {
        display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
      }
      .harmonykey-bubble__icon {
        width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
      }
      .harmonykey-bubble__title {
        font-weight: 600; font-size: 15px; color: #1a1a1a;
      }
      .harmonykey-bubble__body {
        margin-bottom: 14px;
      }
      .harmonykey-bubble__hint {
        margin: 0 0 8px; color: #666; font-size: 13px;
      }
      .harmonykey-bubble__tags {
        display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;
      }
      .harmonykey-tag {
        padding: 2px 10px; border-radius: 100px; font-size: 12px;
        font-weight: 500; color: #fff;
      }
      .harmonykey-tag--low { background: #f1c40f; }
      .harmonykey-tag--medium { background: #f39c12; }
      .harmonykey-tag--high { background: #e74c3c; }
      .harmonykey-bubble__preview {
        background: #f8f9fa; border-radius: 8px; padding: 10px 12px;
      }
      .harmonykey-bubble__preview-label {
        font-size: 12px; color: #999; margin-bottom: 4px;
      }
      .harmonykey-bubble__preview-text {
        font-size: 13px; color: #27ae60; word-break: break-word;
      }
      .harmonykey-bubble__actions {
        display: flex; gap: 8px; justify-content: flex-end;
      }
      .harmonykey-btn {
        padding: 8px 16px; border: none; border-radius: 8px;
        font-size: 13px; font-weight: 500; cursor: pointer;
        transition: all 0.2s ease;
      }
      .harmonykey-btn--apply {
        background: #27ae60; color: #fff;
      }
      .harmonykey-btn--apply:hover {
        background: #219a52;
      }
      .harmonykey-btn--dismiss {
        background: transparent; color: #999;
      }
      .harmonykey-btn--dismiss:hover {
        background: #f0f0f0; color: #666;
      }
    `;
  }
}

export const suggestionBubble = new SuggestionBubble();
