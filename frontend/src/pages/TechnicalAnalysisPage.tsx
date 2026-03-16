import React from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';

const TechnicalAnalysisPage: React.FC = () => {
  return (
    <div>
      <PageHeaderBar
        title="Technical Analysis Terminal"
        subtitle="Structure, momentum, volatility and trend confluence"
        status="healthy"
        statusLabel="TREND ALIGNED"
        activeSymbol="BTC/USD"
      />

      <KpiStrip>
        <KpiCard label="RSI (14)" value="63.2" tone="positive" />
        <KpiCard label="Momentum Score" value="+13.7" tone="positive" />
        <KpiCard label="Volatility" value="Low-Moderate" />
        <KpiCard label="50 MA" value="67,080" tone="positive" />
        <KpiCard label="200 MA" value="66,210" tone="positive" />
        <KpiCard label="Structure" value="Higher High / Low" tone="positive" />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 380px)' }}>
        <SectionCard title="Trend & Momentum Stack">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontWeight: 700, marginBottom: 6 }}>Momentum</div>
              <div style={{ color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
                RSI remains above midline, indicating persistent upside pressure while avoiding extreme overbought risk.
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontWeight: 700, marginBottom: 6 }}>Moving Average Confluence</div>
              <div style={{ color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
                Price holding above 50/200 MA spread supports continuation bias. Trend quality remains constructive.
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Risk / Failure Conditions">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px', color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
            If momentum weakens while volatility expands, expect higher chop risk. Watch for MA retest failure before increasing leverage.
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
        <SectionCard title="Structure Context">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px', color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
            Multi-timeframe structure remains bullish with controlled pullbacks and sustained bid response near dynamic supports.
          </div>
        </SectionCard>

        <SectionCard title="Fallback / Empty-State Safety">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px', color: '#9db0cf', fontSize: 13 }}>
            No data available fallback is supported to keep terminal stable if TA feeds are temporarily unavailable.
          </div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard title="Technical Interpretation" text="Trend remains intact with healthy momentum and manageable volatility backdrop." source="TA layer" />
        <InsightCard title="Operator Guidance" text="Favor continuation setups on pullbacks while maintaining invalidation discipline near key support breaks." source="Operator protocol" />
      </div>
    </div>
  );
};

export default TechnicalAnalysisPage;
