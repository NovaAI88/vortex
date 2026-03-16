import React, { useMemo } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';
import HealthBadge from '../components/ui/HealthBadge';

const alerts = [
  { type: 'Signal', msg: 'AI: Long BTC/USDT @ 67000', time: '22:28' },
  { type: 'Risk', msg: 'Portfolio drawdown hit 5%', time: '21:11' },
  { type: 'Market', msg: 'BTC OI jumps 14% as price breaks $68K', time: '20:57' },
];

const AlertsPage: React.FC = () => {
  const totalAlerts = alerts.length;
  const riskAlerts = useMemo(() => alerts.filter((a) => a.type === 'Risk').length, []);
  const signalAlerts = useMemo(() => alerts.filter((a) => a.type === 'Signal').length, []);
  const marketAlerts = useMemo(() => alerts.filter((a) => a.type === 'Market').length, []);
  const riskLevel = riskAlerts > 0 ? 'Elevated' : 'Normal';
  const priority = riskAlerts > 0 ? 'High' : totalAlerts > 0 ? 'Medium' : 'N/A';
  const healthState = riskAlerts > 0 ? 'warning' : 'healthy';
  const latestTime = alerts[0]?.time || 'N/A';

  return (
    <div>
      <PageHeaderBar
        title="Alerts & Risk Terminal"
        subtitle="Real-time alert surveillance, risk escalation visibility, and operator response context"
        status={healthState as any}
        statusLabel={riskAlerts > 0 ? 'RISK WATCH' : 'STABLE'}
        activeSymbol="ALERT BUS"
        timestamp={latestTime}
      />

      <KpiStrip>
        <KpiCard label="Total Alerts" value={totalAlerts || 'N/A'} />
        <KpiCard label="Risk Alerts" value={riskAlerts || 'N/A'} tone={riskAlerts > 0 ? 'negative' : 'positive'} />
        <KpiCard label="Signal Alerts" value={signalAlerts || 'N/A'} />
        <KpiCard label="Market Alerts" value={marketAlerts || 'N/A'} />
        <KpiCard label="Risk Level" value={riskLevel} tone={riskLevel === 'Elevated' ? 'negative' : 'positive'} />
        <KpiCard label="Last Update" value={latestTime} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)' }}>
        <SectionCard title="Primary Alert Feed">
          <div style={{ display: 'grid', gap: 10 }}>
            {alerts.map((a, i) => (
              <div key={i} className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ color: '#ffeeb3', fontWeight: 800, fontSize: 13 }}>[{a.type}]</div>
                  <div style={{ color: '#837fff', fontWeight: 600, fontSize: 12 }}>{a.time}</div>
                </div>
                <div style={{ color: '#f4f8ff', fontSize: 13, marginTop: 7, lineHeight: 1.45 }}>{a.msg}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Risk Health / Operator Stack"
          actionSlot={<HealthBadge state={healthState as any} label={riskAlerts > 0 ? 'MONITOR' : 'HEALTHY'} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Risk Snapshot</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Current risk level: <b style={{ color: '#eaf1ff' }}>{riskLevel}</b><br />
                Priority class: <b style={{ color: '#eaf1ff' }}>{priority}</b><br />
                Escalation count: <b style={{ color: '#eaf1ff' }}>{riskAlerts}</b>
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Operator Interpretation</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                A risk event is active in the stream. Keep position sizing disciplined and verify whether drawdown pressure is transient or broadening across assets.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginTop: 12 }}>
        <SectionCard title="Risk Drivers / Exposure Context">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Primary Driver</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Portfolio drawdown threshold interaction is the dominant risk catalyst in the current alert window.
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Cross-Market Signal</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                OI expansion alerts suggest participation is increasing, which can amplify both breakout continuation and liquidation risk.
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Scenario / Watchlist / Reaction Context">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Base Scenario</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Risk remains manageable if drawdown pressure stabilizes and no additional risk alerts print in the next monitoring cycle.
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Watchlist Triggers</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Watch for consecutive risk alerts, rising correlation in losses, and failed follow-through after signal alerts.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard
          title="Market Interpretation"
          text="Alert structure indicates an active but controllable stress pocket. Directional opportunities exist, yet elevated leverage participation raises adverse-move sensitivity."
          source="Risk intelligence layer"
        />
        <InsightCard
          title="Operator Action Guidance"
          text="Maintain tighter risk caps while risk alerts are present. Prioritize confirmation and execution quality over frequency until the alert stream normalizes."
          source="Operator protocol"
        />
      </div>
    </div>
  );
};

export default AlertsPage;
