// ============================================================
// 语和 HarmonyKey — 改写建议卡片组件
// 展示改写建议的预览区域（P0 使用本地打码，P1 接入 AI）
// ============================================================

import React, { useState } from 'react';
import type { RewriteSuggestion, RewriteStrategy } from '../../types';

const STRATEGY_LABELS: Record<RewriteStrategy, string> = {
  soften: '温和',
  humor: '幽默',
  assertive: '坚定',
  formal: '正式',
};

// P0 原型：模拟改写建议
const MOCK_SUGGESTIONS: RewriteSuggestion[] = [
  {
    text: '你说得有道理，但我有不同的看法。',
    strategy: 'soften',
    description: '将直接否定转为温和表达',
  },
  {
    text: '哈哈哈哈你这话说得，让我不知道怎么接了😂',
    strategy: 'humor',
    description: '用幽默化解紧张氛围',
  },
  {
    text: '我理解你的观点，不过我想补充几点。',
    strategy: 'assertive',
    description: '保持立场但尊重对方',
  },
];

const RewriteSuggestionCard: React.FC = () => {
  const [suggestions] = useState<RewriteSuggestion[]>(MOCK_SUGGESTIONS);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const handleApply = (suggestion: RewriteSuggestion) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'APPLY_REWRITE',
          payload: { text: suggestion.text },
        });
      }
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div className="harmonykey-card">
      <h2 className="harmonykey-card__title">💡 改写建议预览</h2>
      <p className="harmonykey-card__desc">
        当检测到攻击性表达时，语和将提供多种改写策略供你选择。
        <br />
        <em>P1 阶段将接入 AI 实时流式改写</em>
      </p>

      <div className="harmonykey-suggestions">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`harmonykey-suggestion ${
              selectedIndex === index ? 'harmonykey-suggestion--selected' : ''
            }`}
            onClick={() => setSelectedIndex(index)}
          >
            <div className="harmonykey-suggestion__header">
              <span className={`harmonykey-badge harmonykey-badge--${suggestion.strategy}`}>
                {STRATEGY_LABELS[suggestion.strategy]}
              </span>
              <span className="harmonykey-suggestion__desc">{suggestion.description}</span>
            </div>
            <div className="harmonykey-suggestion__text">{suggestion.text}</div>
            <button
              className="harmonykey-btn harmonykey-btn--small harmonykey-btn--apply"
              onClick={(e) => {
                e.stopPropagation();
                handleApply(suggestion);
              }}
            >
              {applied && selectedIndex === index ? '✓ 已应用' : '应用此改写'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RewriteSuggestionCard;
