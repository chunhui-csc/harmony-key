// ============================================================
// 语和 HarmonyKey — Content Script 入口
// 职责：初始化输入监听器 + 建议气泡 UI
//
// 架构位置：Content Script 层
// 通信：Content Script <-> Service Worker（通过 chrome.runtime.sendMessage）
//        Content Script -> DOM（通过事件监听 + UI 注入）
// ============================================================

import './content.css';
import { inputMonitor } from './input-monitor';
import { suggestionBubble } from './suggestion-bubble';
import type { SensitiveMatch, ExtensionMessage } from '../types';

/**
 * 匹配到敏感词时的处理
 * 在输入框附近显示建议气泡
 */
function handleSensitiveMatch(matches: SensitiveMatch[], originalText: string): void {
  const anchorElement = inputMonitor.getCurrentElement();
  if (!anchorElement) return;

  suggestionBubble.show({
    matches,
    originalText,
    anchorElement,
    onApplyRewrite: (rewrittenText: string) => {
      applyRewriteToInput(anchorElement, rewrittenText);
      suggestionBubble.destroy();
    },
    onDismiss: () => {
      suggestionBubble.destroy();
    },
  });
}

/**
 * 将改写后的文本应用到当前输入框
 * 非侵入式：通过 DOM API 设置 value/innerText，不操作内存
 */
function applyRewriteToInput(element: HTMLElement, text: string): void {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    // 原生表单元素：直接设置 value
    element.value = text;
    // 触发 input 事件以通知框架（React/Vue 等）
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (element.getAttribute('contenteditable') === 'true') {
    // contenteditable：设置文本内容
    element.textContent = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  console.log('[HarmonyKey] 已应用温和表达');
}

// ---- 监听来自 Popup / Service Worker 的消息 ----
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    try {
      switch (message.type) {
        case 'UPDATE_SETTINGS': {
          inputMonitor.updateSettings(message.payload);
          sendResponse({ type: 'SETTINGS_UPDATED', payload: message.payload });
          break;
        }
        case 'APPLY_REWRITE': {
          const el = inputMonitor.getCurrentElement();
          if (el) {
            applyRewriteToInput(el, message.payload.text);
          }
          sendResponse({ type: 'APPLY_REWRITE', payload: { text: message.payload.text } });
          break;
        }
        case 'DISMISS_BUBBLE': {
          suggestionBubble.destroy();
          break;
        }
        default:
          break;
      }
    } catch (err) {
      // 扩展上下文失效时静默处理
      console.warn('[HarmonyKey] 消息处理异常:', err);
    }
    return true;
  }
);

// ---- 启动 ----
(function init() {
  try {
    inputMonitor.onMatch(handleSensitiveMatch);
    inputMonitor.start().catch((err) => {
      console.error('[HarmonyKey] 初始化失败:', err);
    });
    console.log('[HarmonyKey] Content Script 初始化完成 ✓');
  } catch (err) {
    console.error('[HarmonyKey] Content Script 启动异常:', err);
  }
})();

// 导出供测试使用
export { handleSensitiveMatch, applyRewriteToInput };
