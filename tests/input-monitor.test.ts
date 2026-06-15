// ============================================================
// 语和 HarmonyKey — 输入监听器单元测试
// ============================================================

/**
 * @jest-environment jsdom
 */

// 模拟 chrome API
const mockChromeSendMessage = jest.fn(() => Promise.resolve());
(global as any).chrome = {
  runtime: {
    sendMessage: mockChromeSendMessage,
    onMessage: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn((_key: string, callback: (result: any) => void) => {
        callback({});
      }),
      set: jest.fn((_items: any, callback?: () => void) => {
        if (callback) callback();
      }),
    },
  },
};

import { InputMonitor } from '../src/content/input-monitor';

/** 创建一个可用于测试的 textarea（JSDOM 中 getBoundingClientRect 默认为 0） */
function createTestTextarea(value: string): HTMLTextAreaElement {
  const el = document.createElement('textarea');
  el.value = value;
  // JSDOM 默认 getBoundingClientRect 返回全 0，导致 isValidInputTarget 失败
  el.getBoundingClientRect = () => ({
    width: 300, height: 40,
    x: 0, y: 0, left: 0, right: 300, top: 0, bottom: 40,
    toJSON: () => ({}),
  });
  return el;
}

describe('InputMonitor', () => {
  let monitor: InputMonitor;

  beforeEach(() => {
    monitor = new InputMonitor();
    mockChromeSendMessage.mockClear();
    ((global as any).chrome.storage.local.get as jest.Mock).mockClear();
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('start() / stop()', () => {
    it('start 应注册事件监听器', async () => {
      const addSpy = jest.spyOn(document, 'addEventListener');
      await monitor.start();
      expect(addSpy).toHaveBeenCalledWith('input', expect.any(Function), true);
      expect(addSpy).toHaveBeenCalledWith('focusin', expect.any(Function));
      addSpy.mockRestore();
    });

    it('stop 应移除事件监听器', async () => {
      const removeSpy = jest.spyOn(document, 'removeEventListener');
      await monitor.start();
      monitor.stop();
      expect(removeSpy).toHaveBeenCalledWith('input', expect.any(Function), true);
      removeSpy.mockRestore();
    });
  });

  describe('input 事件处理', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应在 input 事件后触发防抖分析', async () => {
      const onMatchMock = jest.fn();
      monitor.onMatch(onMatchMock);
      await monitor.start();

      const textarea = createTestTextarea('你这个傻逼');
      document.body.appendChild(textarea);

      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // 防抖未到，不应触发回调
      expect(onMatchMock).not.toHaveBeenCalled();

      // 快进 500ms
      jest.advanceTimersByTime(500);

      // 现在应该触发了回调
      expect(onMatchMock).toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it('应在防抖期间取消前一次调用', async () => {
      const onMatchMock = jest.fn();
      monitor.onMatch(onMatchMock);
      await monitor.start();

      const textarea = createTestTextarea('你这个傻逼');
      document.body.appendChild(textarea);

      // 快速连续触发
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      jest.advanceTimersByTime(200);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      jest.advanceTimersByTime(200);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // 此时不应触发
      expect(onMatchMock).not.toHaveBeenCalled();

      // 等到最终防抖完成
      jest.advanceTimersByTime(500);
      expect(onMatchMock).toHaveBeenCalledTimes(1);

      document.body.removeChild(textarea);
    });

    it('应忽略密码输入框', async () => {
      const onMatchMock = jest.fn();
      monitor.onMatch(onMatchMock);
      await monitor.start();

      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      passwordInput.value = 'fuck';
      document.body.appendChild(passwordInput);

      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      jest.advanceTimersByTime(500);

      expect(onMatchMock).not.toHaveBeenCalled();

      document.body.removeChild(passwordInput);
    });

    it('应在禁用时不处理输入', async () => {
      const onMatchMock = jest.fn();
      monitor.onMatch(onMatchMock);
      monitor.updateSettings({ enabled: false });
      await monitor.start();

      const textarea = createTestTextarea('你这个傻逼');
      document.body.appendChild(textarea);

      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      jest.advanceTimersByTime(500);

      expect(onMatchMock).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });
  });

  describe('updateSettings()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('更新防抖延迟应重新创建防抖函数', async () => {
      await monitor.start();
      monitor.updateSettings({ debounceMs: 1000 });

      const onMatchMock = jest.fn();
      monitor.onMatch(onMatchMock);

      const textarea = createTestTextarea('你这个白痴');
      document.body.appendChild(textarea);

      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // 500ms 不应触发（现在是 1000ms 防抖）
      jest.advanceTimersByTime(500);
      expect(onMatchMock).not.toHaveBeenCalled();

      // 1000ms 应触发
      jest.advanceTimersByTime(500);
      expect(onMatchMock).toHaveBeenCalled();

      document.body.removeChild(textarea);
    });
  });
});
