// ============================================================
// 语和 HarmonyKey — 设置面板组件
// 允许用户配置敏感度、模式、自动替换等
// ============================================================

import React from 'react';
import type { UserSettings } from '../../types';

interface Props {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
}

const SettingsPanel: React.FC<Props> = ({ settings, onUpdate }) => {
  return (
    <div className="harmonykey-card">
      <h2 className="harmonykey-card__title">⚙️ 设置</h2>

      {/* 启用开关 */}
      <div className="harmonykey-setting">
        <div className="harmonykey-setting__info">
          <label className="harmonykey-setting__label">启用语和</label>
          <p className="harmonykey-setting__hint">开启/关闭输入监听与分析</p>
        </div>
        <label className="harmonykey-toggle">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
          />
          <span className="harmonykey-toggle__slider" />
        </label>
      </div>

      {/* 敏感度 */}
      <div className="harmonykey-setting">
        <div className="harmonykey-setting__info">
          <label className="harmonykey-setting__label">敏感度等级</label>
          <p className="harmonykey-setting__hint">
            控制检测的严格程度。低：仅检测严重攻击；高：检测所有潜在敏感词
          </p>
        </div>
        <select
          className="harmonykey-select"
          value={settings.sensitivity}
          onChange={(e) =>
            onUpdate({
              sensitivity: e.target.value as 'low' | 'medium' | 'high',
            })
          }
        >
          <option value="low">低 — 仅严重</option>
          <option value="medium">中 — 标准（推荐）</option>
          <option value="high">高 — 严格</option>
        </select>
      </div>

      {/* 工作模式 */}
      <div className="harmonykey-setting">
        <div className="harmonykey-setting__info">
          <label className="harmonykey-setting__label">工作模式</label>
          <p className="harmonykey-setting__hint">
            更严格的检测策略，适合职场沟通场景
          </p>
        </div>
        <label className="harmonykey-toggle">
          <input
            type="checkbox"
            checked={settings.workMode}
            onChange={(e) => onUpdate({ workMode: e.target.checked })}
          />
          <span className="harmonykey-toggle__slider" />
        </label>
      </div>

      {/* 游戏模式 */}
      <div className="harmonykey-setting">
        <div className="harmonykey-setting__info">
          <label className="harmonykey-setting__label">游戏模式</label>
          <p className="harmonykey-setting__hint">
            更宽松的策略，保留游戏交流的表达空间
          </p>
        </div>
        <label className="harmonykey-toggle">
          <input
            type="checkbox"
            checked={settings.gameMode}
            onChange={(e) => onUpdate({ gameMode: e.target.checked })}
          />
          <span className="harmonykey-toggle__slider" />
        </label>
      </div>

      {/* 自动替换 */}
      <div className="harmonykey-setting">
        <div className="harmonykey-setting__info">
          <label className="harmonykey-setting__label">自动替换</label>
          <p className="harmonykey-setting__hint">
            不询问直接替换敏感词为温和表达（P1 阶段实现）
          </p>
        </div>
        <label className="harmonykey-toggle">
          <input
            type="checkbox"
            checked={settings.autoReplace}
            onChange={(e) => onUpdate({ autoReplace: e.target.checked })}
          />
          <span className="harmonykey-toggle__slider" />
        </label>
      </div>

      {/* 防抖延迟 */}
      <div className="harmonykey-setting">
        <div className="harmonykey-setting__info">
          <label className="harmonykey-setting__label">
            防抖延迟：{settings.debounceMs}ms
          </label>
          <p className="harmonykey-setting__hint">
            用户停止输入后等待多久触发分析
          </p>
        </div>
        <input
          type="range"
          className="harmonykey-slider"
          min={200}
          max={1500}
          step={100}
          value={settings.debounceMs}
          onChange={(e) => onUpdate({ debounceMs: parseInt(e.target.value) })}
        />
      </div>
    </div>
  );
};

export default SettingsPanel;
