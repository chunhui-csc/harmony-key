// ============================================================
// 语和 HarmonyKey — Service Worker (Background)
// Manifest V3 后台服务
//
// 职责：
// 1. 消息路由（Content Script <-> Popup）
// 2. 统计数据的持久化存储
// 3. SSE 流式改写请求代理（P1 阶段启用）
// 4. 用户设置的读写
// ============================================================

import type {
  ExtensionMessage,
  DashboardStats,
  UserSettings,
  EmotionAnalysis,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';

// ---- 统计数据 ----

let stats: DashboardStats = {
  totalMonitors: 0,
  alertsTriggered: 0,
  rewritesApplied: 0,
  emotionDistribution: {
    neutral: 0,
    angry: 0,
    sad: 0,
    anxious: 0,
    positive: 0,
    aggressive: 0,
  },
  calmStreak: 0,
};

// ---- 初始化 ----

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[HarmonyKey] 扩展已安装/更新');

  // 初始化默认设置
  const existing = await chrome.storage.local.get('settings');
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  // 初始化统计数据
  await chrome.storage.local.set({ stats });
});

// ---- 消息路由 ----

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((err) => {
        console.error('[HarmonyKey] 消息处理失败:', err);
        sendResponse({ type: 'REWRITE_STREAM_ERROR', payload: { error: err.message } });
      });
    return true; // 保持通道开启（异步）
  }
);

async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender
): Promise<ExtensionMessage> {
  switch (message.type) {
    // ---- 文本分析结果上报 ----
    case 'ANALYSIS_RESULT': {
      const { sensitiveMatches, aggressionScore } = message.payload;
      stats.totalMonitors++;

      if (sensitiveMatches.length > 0) {
        stats.alertsTriggered++;
      }

      // 更新情绪分布（基于攻击性评分做简单推断）
      if (aggressionScore > 0.7) {
        stats.emotionDistribution.aggressive++;
      } else if (aggressionScore > 0.3) {
        stats.emotionDistribution.angry++;
      } else {
        stats.emotionDistribution.neutral++;
      }

      // 持久化
      await chrome.storage.local.set({ stats });
      return message;
    }

    // ---- 获取统计数据 ----
    case 'GET_STATS': {
      const saved = await chrome.storage.local.get('stats');
      if (saved.stats) {
        stats = saved.stats;
      }
      return { type: 'STATS_RESULT', payload: stats };
    }

    // ---- 获取/更新设置 ----
    case 'UPDATE_SETTINGS': {
      const current = await chrome.storage.local.get('settings');
      const newSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...(current.settings || {}),
        ...message.payload,
      };
      await chrome.storage.local.set({ settings: newSettings });

      // 通知所有 Content Script 更新设置
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'UPDATE_SETTINGS',
            payload: message.payload,
          }).catch(() => {
            // 该 tab 可能没有注入 Content Script，忽略
          });
        }
      }

      return { type: 'SETTINGS_UPDATED', payload: newSettings };
    }

    // ---- 请求 AI 改写（P1 阶段实现） ----
    case 'REQUEST_REWRITE': {
      // TODO P1: 调用 Qwen/GLM API via SSE 流式改写
      console.warn('[HarmonyKey] AI 改写功能将在 P1 阶段启用');
      return {
        type: 'REWRITE_RESULT',
        payload: {
          original: message.payload.text,
          suggestions: [],
        },
      };
    }

    default:
      return message;
  }
}

// ---- 生命周期 ----

// Service Worker 被唤醒时恢复统计数据
try {
  chrome.storage.local.get('stats', (result) => {
    if (result.stats) {
      stats = result.stats;
    }
  });
} catch (err) {
  console.error('[HarmonyKey] Service Worker 初始化失败:', err);
}

console.log('[HarmonyKey] Service Worker 初始化完成 ✓');
