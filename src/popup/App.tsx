// ============================================================
// 语和 HarmonyKey — Popup 主应用组件
// 包含情绪仪表盘 + 改写建议展示 + 设置入口
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import EmotionDashboard from './components/EmotionDashboard';
import RewriteSuggestionCard from './components/RewriteSuggestion';
import SettingsPanel from './components/Settings';
import type { DashboardStats, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

type PopupView = 'dashboard' | 'settings';

const App: React.FC = () => {
  const [view, setView] = useState<PopupView>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // 加载统计数据
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
      if (response?.type === 'STATS_RESULT') {
        setStats(response.payload);
      }
      setLoading(false);
    });
  }, []);

  // 更新设置
  const handleUpdateSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      const updated = { ...settings, ...partial };
      setSettings(updated);
      chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: partial,
      });
    },
    [settings]
  );

  return (
    <div className="harmonykey-popup">
      {/* ---- Header ---- */}
      <header className="harmonykey-header">
        <div className="harmonykey-header__brand">
          <span className="harmonykey-header__logo">🔑</span>
          <h1 className="harmonykey-header__title">语和 HarmonyKey</h1>
        </div>
        <div className="harmonykey-header__nav">
          <button
            className={`harmonykey-nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            仪表盘
          </button>
          <button
            className={`harmonykey-nav-btn ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            设置
          </button>
        </div>
      </header>

      {/* ---- Body ---- */}
      <main className="harmonykey-body">
        {loading ? (
          <div className="harmonykey-loading">
            <div className="harmonykey-loading__spinner" />
            <p>加载中...</p>
          </div>
        ) : view === 'dashboard' ? (
          <>
            <EmotionDashboard stats={stats} />
            <RewriteSuggestionCard />
          </>
        ) : (
          <SettingsPanel
            settings={settings}
            onUpdate={handleUpdateSettings}
          />
        )}
      </main>

      {/* ---- Footer ---- */}
      <footer className="harmonykey-footer">
        <span className="harmonykey-footer__version">v0.1.0 · P0 原型</span>
        <span className="harmonykey-footer__badge">隐私优先 · 本地处理</span>
      </footer>
    </div>
  );
};

export default App;
