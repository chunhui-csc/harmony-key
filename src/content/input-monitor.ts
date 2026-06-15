// ============================================================
// 语和 HarmonyKey — 输入监听器 (Content Script)
// 非侵入式 DOM 监听，捕获输入框内容并触发本地敏感词过滤
//
// 设计要点：
// 1. 监听 input 事件的冒泡阶段（不直接 Hook 内存）
// 2. 500ms 防抖延迟（符合 SRS 要求）
// 3. 仅处理可见的文本输入元素（合规：不读取隐藏/密码字段）
// 4. 全内存处理，不上传/不缓存聊天记录
// ============================================================

import { sensitiveFilter } from './sensitive-filter';
import type { SensitiveMatch, EmotionAnalysis, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { debounce, storage } from '../shared/messages';

/**
 * 判断元素是否为有效的文本输入目标（黑名单模式）
 *
 * 任何可见的文本类输入元素都接受，只排除特定不可用类型。
 * 这比白名单更具通用性，适配不同网站的 DOM 差异。
 */
function isValidInputTarget(element: HTMLElement): boolean {
  if (!element) return false;

  // 检查是否可见（过滤隐藏/0尺寸元素）
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  // 排除特定类型
  if (element instanceof HTMLInputElement) {
    const ignoreTypes = ['password', 'hidden', 'file', 'checkbox', 'radio', 'submit', 'reset', 'button', 'image', 'color', 'range'];
    if (ignoreTypes.includes(element.type)) return false;
  }

  // 排除不可编辑元素
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.readOnly || element.disabled) return false;
  }

  // 检查 aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') return false;

  return true;
}

/**
 * 获取输入框中的当前文本
 */
function getInputText(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value || '';
  }
  if (element.getAttribute('contenteditable') === 'true') {
    return element.innerText || element.textContent || '';
  }
  return '';
}

/**
 * 输入监听器
 *
 * 严格遵循 SRS 合规要求：
 * - 仅 DOM 事件监听，不 Hook / 注入 / 修改目标应用内存
 * - 不读取聊天上下文/历史，仅处理当前输入框文本
 * - 微信 / QQ 风控兼容：不使用任何内存注入技术
 */
export class InputMonitor {
  private debouncedAnalyze: (text: string) => void;
  private onMatchCallback?: (matches: SensitiveMatch[], originalText: string) => void;
  private currentElement: HTMLElement | null = null;
  private settings: UserSettings = { ...DEFAULT_SETTINGS };
  private contextValid: boolean = true;

  constructor() {
    this.debouncedAnalyze = debounce(this.analyze.bind(this), this.settings.debounceMs);
  }

  /** 安全地调用 Chrome API，捕获上下文失效错误 */
  private async safeChromeAPI<T>(fn: () => Promise<T>): Promise<T | null> {
    if (!this.contextValid) return null;
    try {
      return await fn();
    } catch (err) {
      if (err instanceof Error && err.message.includes('Extension context invalidated')) {
        console.warn('[HarmonyKey] 扩展上下文已失效，停止监听。请刷新页面。');
        this.contextValid = false;
        this.stop();
      }
      throw err;
    }
  }

  /**
   * 开始监听
   */
  async start(): Promise<void> {
    try {
      // 加载用户设置（如果上下文已失效则跳过）
      const saved = await this.safeChromeAPI(() => storage.get<UserSettings>('settings'));
      if (!this.contextValid) return;
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...saved };
      }
    } catch {
      // storage.get 失败则使用默认设置继续
      console.warn('[HarmonyKey] 无法加载设置，使用默认值');
    }

    // 初始化敏感词过滤器
    sensitiveFilter.initialize(this.settings.sensitivity);

    // 在 document 上监听 input 事件（冒泡捕获）
    document.addEventListener('input', this.handleInput, true);

    // 监听 focusin 以追踪当前活跃输入框
    document.addEventListener('focusin', this.handleFocus);

    console.log('[HarmonyKey] 输入监听器已启动 (debounce=%dms, sensitivity=%s)',
      this.settings.debounceMs, this.settings.sensitivity);
  }

  /**
   * 停止监听
   */
  stop(): void {
    document.removeEventListener('input', this.handleInput, true);
    document.removeEventListener('focusin', this.handleFocus);
    console.log('[HarmonyKey] 输入监听器已停止');
  }

  /**
   * 更新设置
   */
  updateSettings(newSettings: Partial<UserSettings>): void {
    const oldDebounce = this.settings.debounceMs;
    this.settings = { ...this.settings, ...newSettings };

    if (this.settings.debounceMs !== oldDebounce) {
      // 重新创建防抖函数
      this.debouncedAnalyze = debounce(this.analyze.bind(this), this.settings.debounceMs);
    }
    if (newSettings.sensitivity) {
      sensitiveFilter.reload(this.settings.sensitivity);
    }
  }

  /**
   * 设置匹配回调
   */
  onMatch(callback: (matches: SensitiveMatch[], originalText: string) => void): void {
    this.onMatchCallback = callback;
  }

  /**
   * 获取当前活跃输入元素
   */
  getCurrentElement(): HTMLElement | null {
    // 验证元素仍在 DOM 中
    if (this.currentElement && document.contains(this.currentElement)) {
      return this.currentElement;
    }
    return null;
  }

  // ---- 私有方法 ----

  /**
   * 处理 input 事件
   *
   * 使用黑名单模式：默认接受所有可见的文本类输入元素，
   * 仅排除密码/隐藏/禁用等类型。适配不同网站的 DOM 差异。
   *
   * Shadow DOM 穿透：event.composedPath()[0] 可以获取 Shadow DOM
   * 内部的真实元素，规避 event.target 被重定向到 Shadow Host 的问题。
   */
  private handleInput = (event: Event): void => {
    if (!this.settings.enabled) return;

    // composedPath()[0] 获取 Shadow DOM 内部真实元素（兼容 Bilibili 等 SPA）
    const target = (event.composedPath?.()[0] ?? event.target) as HTMLElement;
    if (!isValidInputTarget(target)) return;

    // 隐私沙箱：仅提取文本，不关联用户身份/上下文
    const text = getInputText(target);
    if (text.length === 0) return;

    // 防抖后触发分析
    this.debouncedAnalyze(text);
  };

  /**
   * 处理 focus 事件（追踪当前输入框，支持 Shadow DOM）
   */
  private handleFocus = (event: FocusEvent): void => {
    const target = (event.composedPath?.()[0] ?? event.target) as HTMLElement;
    if (isValidInputTarget(target)) {
      this.currentElement = target;
    }
  };

  /**
   * 执行分析（防抖后调用）
   * 隐私优先：全程在内存中完成，不发送任何网络请求
   */
  private analyze(text: string): void {
    if (!this.contextValid) return;

    // 第一层：Aho-Corasick 敏感词快速过滤
    const matches = sensitiveFilter.scan(text);

    if (matches.length > 0 && this.onMatchCallback) {
      this.onMatchCallback(matches, text);
    }

    // TODO P1: 第二层 — 调用本地 ONNX BERT 模型进行情绪分类
    // TODO P1: 第三层 — 若用户请求改写，调用云端 API (Qwen/GLM) via SSE

    // 向 Service Worker 上报统计（仅计数，不传文本内容）
    this.safeChromeAPI(() =>
      new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'ANALYSIS_RESULT',
          payload: {
            sensitiveMatches: matches,
            aggressionScore: sensitiveFilter.getAggressionScore(text),
          },
        }, () => resolve()); // 使用回调形式，避免 Promise rejection
      })
    ).catch(() => {
      // 上下文失效时已在 safeChromeAPI 中处理
    });
  }
}

/** 全局输入监听器实例 */
export const inputMonitor = new InputMonitor();
