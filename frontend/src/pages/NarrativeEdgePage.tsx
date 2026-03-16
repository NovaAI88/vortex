import React from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';

const NarrativeEdgePage: React.FC = () => {
  return (
    <div>
      <PageHeaderBar
        title="Narrative Edge Terminal"
        subtitle="Macro storylines, cycle context and unconventional market framing"
        status="info"
        statusLabel="NARRATIVE ACTIVE"
        activeSymbol="CONTEXT"
      />

      <KpiStrip>
        <KpiCard label="Moon Phase" value="Waxing Gibbous" />
        <KpiCard label="Seasonality" value="Spring Bounce" tone="positive" />
        <KpiCard label="Volatility Cycle" value="Mid / Descending" />
        <KpiCard label="Macro Stress" value="Moderate" />
        <KpiCard label="Liquidity Tone" value="Improving" tone="positive" />
        <KpiCard label="Narrative Bias" value="Constructive" tone="positive" />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 380px)' }}>
        <SectionCard title="Narrative Context Matrix">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontWeight: 700, marginBottom: 6 }}>Primary Storyline</div>
              <div style={{ color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
                ETF flow stability and calmer macro volatility continue to support risk assets with selective upside rotation.
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontWeight: 700, marginBottom: 6 }}>Cycle Interpretation</div>
              <div style={{ color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
                Market sits in a constructive middle phase where trend-following still works, but rotation and dispersion increase.
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Narrative Risk Controls">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px', color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
            If macro shock headlines accelerate or volatility regimes flip abruptly, narrative conviction can unwind faster than price signals.
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
        <SectionCard title="Unconventional Signals">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px', color: '#c4d8f8', fontSize: 13, lineHeight: 1.55 }}>
            Alternate-cycle framing currently supports constructive bias, but should always be validated by structure and liquidity data.
          </div>
        </SectionCard>

        <SectionCard title="Fallback / Empty-State Safety">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px', color: '#9db0cf', fontSize: 13 }}>
            Narrative terminal remains stable if contextual feeds are unavailable. No runtime crash paths on empty input.
          </div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard title="Narrative Interpretation" text="Current macro and flow story supports selective upside with disciplined risk overlays." source="Narrative layer" />
        <InsightCard title="Operator Guidance" text="Use narrative context as a filter, not a trigger. Execute only when narrative and structure agree." source="Operator protocol" />
      </div>
    </div>
  );
};

export default NarrativeEdgePage;
