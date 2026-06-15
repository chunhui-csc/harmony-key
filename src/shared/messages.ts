// ============================================================
// 语和 HarmonyKey — 消息类型常量与工具函数
// ============================================================

import type { ExtensionMessage, UserSettings, DashboardStats } from '../types';

/**
 * 向 Service Worker 发送消息
 */
export async function sendToBackground(
  message: ExtensionMessage
): Promise<ExtensionMessage> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response as ExtensionMessage);
      }
    });
  });
}

/**
 * 向当前活动 Tab 发送消息
 */
export async function sendToActiveTab(
  message: ExtensionMessage
): Promise<ExtensionMessage> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        reject(new Error('No active tab found'));
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response as ExtensionMessage);
        }
      });
    });
  });
}

/**
 * 持久化存储工具
 */
export const storage = {
  async get<T>(key: string): Promise<T | undefined> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] as T | undefined);
      });
    });
  },

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  },

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  },
};

/**
 * 防抖函数
 * @param fn 目标函数
 * @param delay 延迟毫秒数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}
