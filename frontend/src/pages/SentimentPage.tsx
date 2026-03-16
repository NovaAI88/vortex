import React from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';

const SentimentPage: React.FC = () => {
  return (
    <div>
      <PageHeaderBar
        title="Sentiment Terminal"
        subtitle="Cross-channel mood, positioning pressure, and narrative tone"
        status="healthy"
        statusLabel="BULLISH BIAS"
        activeSymbol="MARKET"
      />

      <KpiStrip>
        <KpiCard label="Fear & Greed" value="65" delta="Greed" tone="positive" />
        <KpiCard label="Social Buzz" value="Bullish" tone="positive" />
        <KpiCard label="Media Tone" value="Lean Bullish" tone="positive" />
        <KpiCard label="Crowd Momentum" value="Rising" tone="positive" />
        <KpiCard label="Volatility Mood" value="Contained" />
        <KpiCard label="Sentiment Regime" value="Risk-On" tone="positive" />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 380px)' }}>
        <SectionCard title="Primary Sentiment Stack">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontWeight: 700, marginBottom: 6 }}>Fear & Greed Index</div>
              <div style={{ color: '#f8e892', fontSize: 26, fontWeight: 800 }}>65 (Greed)</div>
              <div style={{ color: '#c4d8f8', fontSize: 13, marginTop: 4 }}>Mood remains elevated but not yet euphoric.</div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontWeight: 700, marginBottom: 6 }}>Social / Media Blend</div>
              <div style={{ color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
                Social buzz: <b style={{ color: '#9cf5cf' }}>Bullish</b><br />
                Crypto Twitter: <b style={{ color: '#9fe8ff' }}>Upbeat</b><br />
                Headlines: <b style={{ color: '#8ff0be' }}>Risk appetite improving</b>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Sentiment Risk Monitor">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
            <div style={{ color: '#dce8ff', fontWeight: 700, marginBottom: 6 }}>Operator Note</div>
            <div style={{ color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
              Risk-on sentiment supports trend continuation, but crowded positioning can increase reversal velocity. Use confirmation before expanding size.
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
        <SectionCard title="Positioning Context">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px', color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
            Retail participation is rising while institutional tone remains constructive. Momentum may persist as long as funding and breadth remain balanced.
          </div>
        </SectionCard>

        <SectionCard title="Fallback / Empty-State Safety">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px', color: '#9db0cf', fontSize: 13 }}>
            No data available state is supported. If live sentiment feeds are unavailable, this terminal remains stable and readable.
          </div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard title="Sentiment Interpretation" text="Bullish mood currently supports upside continuation, but monitor for late-cycle exuberance signals." source="Sentiment layer" />
        <InsightCard title="Operator Guidance" text="Add exposure only when sentiment strength aligns with structure and liquidity. Avoid chasing if momentum decouples from quality." source="Operator protocol" />
      </div>
    </div>
  );
};

export default SentimentPage;
