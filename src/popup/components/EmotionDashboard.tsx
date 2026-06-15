// ============================================================
// 语和 HarmonyKey — 情绪仪表盘组件
// 展示用户的情绪统计数据与可视化
// ============================================================

import React from 'react';
import type { DashboardStats, EmotionLabel } from '../../types';

interface Props {
  stats: DashboardStats | null;
}

const EMOTION_LABELS: Record<EmotionLabel, { label: string; color: string; emoji: string }> = {
  neutral: { label: '中性', color: '#95a5a6', emoji: '😐' },
  angry: { label: '愤怒', color: '#e74c3c', emoji: '😠' },
  sad: { label: '悲伤', color: '#3498db', emoji: '😢' },
  anxious: { label: '焦虑', color: '#f39c12', emoji: '😰' },
  positive: { label: '积极', color: '#27ae60', emoji: '😊' },
  aggressive: { label: '攻击性', color: '#c0392b', emoji: '💢' },
};

const EmotionDashboard: React.FC<Props> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="harmonykey-card harmonykey-empty">
        <p>暂无数据</p>
        <p className="harmonykey-empty__hint">开始输入文本，语和将实时分析情绪</p>
      </div>
    );
  }

  // 计算情绪分布百分比
  const totalEmotions = Object.values(stats.emotionDistribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="harmonykey-card">
      <h2 className="harmonykey-card__title">📊 情绪仪表盘</h2>

      {/* 关键指标 */}
      <div className="harmonykey-metrics">
        <div className="harmonykey-metric">
          <span className="harmonykey-metric__value">{stats.totalMonitors}</span>
          <span className="harmonykey-metric__label">监听次数</span>
        </div>
        <div className="harmonykey-metric harmonykey-metric--warn">
          <span className="harmonykey-metric__value">{stats.alertsTriggered}</span>
          <span className="harmonykey-metric__label">触发警示</span>
        </div>
        <div className="harmonykey-metric harmonykey-metric--good">
          <span className="harmonykey-metric__value">{stats.rewritesApplied}</span>
          <span className="harmonykey-metric__label">采纳改写</span>
        </div>
      </div>

      {/* 连续温和天数 */}
      <div className="harmonykey-streak">
        <span className="harmonykey-streak__icon">🔥</span>
        <span className="harmonykey-streak__text">
          连续温和表达 <strong>{stats.calmStreak}</strong> 天
        </span>
      </div>

      {/* 情绪分布条 */}
      <div className="harmonykey-distribution">
        <h3 className="harmonykey-distribution__title">情绪分布</h3>
        <div className="harmonykey-distribution__bar">
          {(Object.entries(stats.emotionDistribution) as [EmotionLabel, number][])
            .filter(([, count]) => count > 0)
            .map(([emotion, count]) => {
              const info = EMOTION_LABELS[emotion];
              const pct = Math.round((count / totalEmotions) * 100);
              return (
                <div
                  key={emotion}
                  className="harmonykey-distribution__segment"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: info.color,
                  }}
                  title={`${info.label}: ${count}次 (${pct}%)`}
                />
              );
            })}
        </div>
        <div className="harmonykey-distribution__legend">
          {(Object.entries(stats.emotionDistribution) as [EmotionLabel, number][])
            .filter(([, count]) => count > 0)
            .map(([emotion, count]) => {
              const info = EMOTION_LABELS[emotion];
              return (
                <span key={emotion} className="harmonykey-legend-item">
                  <span
                    className="harmonykey-legend-item__dot"
                    style={{ backgroundColor: info.color }}
                  />
                  {info.emoji} {info.label} ({count})
                </span>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default EmotionDashboard;
