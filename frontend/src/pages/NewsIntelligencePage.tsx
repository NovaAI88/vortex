import React, { useMemo } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';
import HealthBadge from '../components/ui/HealthBadge';

const news = [
  { headline: 'BTC breaks $68k as ETFs set new inflow record', summary: 'Spot BTC ETFs drive fresh institutional buying. Volatility rising as retail FOMO returns.', asset: 'BTC', bias: 'Bullish', time: '4 min ago' },
  { headline: 'ETH gas spikes 150% amid meme run', summary: 'NFT and meme asset surge causes short-term congestion on Ethereum.', asset: 'ETH', bias: 'Mixed', time: '13 min ago' },
  { headline: 'SOL lead dev: Protocol upgrade on track', summary: 'Solana devs claim new upgrade delivers 2x+ speed, slashing outages.', asset: 'SOL', bias: 'Bullish', time: '34 min ago' }
];

const NewsIntelligencePage: React.FC = () => {
  const headlineCount = news.length;
  const bullish = useMemo(() => news.filter((n) => String(n.bias).toLowerCase() === 'bullish').length, []);
  const mixed = useMemo(() => news.filter((n) => String(n.bias).toLowerCase() === 'mixed').length, []);

  const sentiment = headlineCount > 0 ? (bullish / headlineCount >= 0.66 ? 'Positive' : bullish / headlineCount >= 0.4 ? 'Balanced' : 'Neutral') : 'N/A';
  const marketBias = bullish > mixed ? 'Risk-On' : bullish === mixed ? 'Mixed' : 'Risk-Off';
  const narrativeStrength = headlineCount >= 3 ? 'High' : headlineCount > 0 ? 'Medium' : 'N/A';
  const volatilityRisk = mixed > 0 ? 'Elevated' : 'Moderate';
  const lastUpdate = news[0]?.time || 'N/A';
  const healthState = sentiment === 'Positive' ? 'healthy' : sentiment === 'Balanced' ? 'warning' : 'info';

  return (
    <div>
      <PageHeaderBar
        title="News Intelligence Terminal"
        subtitle="Macro narrative intelligence, newsflow synthesis, and market context monitoring"
        status={healthState as any}
        statusLabel={sentiment === 'N/A' ? 'NO FEED' : `SENTIMENT ${sentiment.toUpperCase()}`}
        activeSymbol="NEWSFLOW"
        timestamp={lastUpdate}
      />

      <KpiStrip>
        <KpiCard label="News Sentiment" value={sentiment} tone={sentiment === 'Positive' ? 'positive' : 'neutral'} />
        <KpiCard label="Headline Count" value={headlineCount || 'N/A'} />
        <KpiCard label="Market Bias" value={marketBias} />
        <KpiCard label="Narrative Strength" value={narrativeStrength} />
        <KpiCard label="Volatility Risk" value={volatilityRisk} tone={volatilityRisk === 'Elevated' ? 'negative' : 'neutral'} />
        <KpiCard label="Last Update" value={lastUpdate} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)' }}>
        <SectionCard title="Primary News Intelligence Overview">
          <div style={{ display: 'grid', gap: 10 }}>
            {news.map((n, i) => (
              <div key={i} className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#90efcb', marginBottom: 6 }}>{n.headline}</div>
                <div style={{ color: '#b2e8ff', fontWeight: 500, fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{n.summary}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, color: '#87a7c4', fontWeight: 600, fontSize: 12.5 }}>
                  <span>Asset: <b style={{ color: '#dbe7ff' }}>{n.asset}</b></span>
                  <span>Bias: <b style={{ color: '#dbe7ff' }}>{n.bias}</b></span>
                  <span>{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Sentiment / Health / Operator Stack"
          actionSlot={<HealthBadge state={healthState as any} label={volatilityRisk === 'Elevated' ? 'WATCH' : 'STABLE'} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Sentiment Readout</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Aggregate sentiment: <b style={{ color: '#eaf1ff' }}>{sentiment}</b><br />
                Bias spread: <b style={{ color: '#eaf1ff' }}>{bullish} bullish / {mixed} mixed</b><br />
                Volatility profile: <b style={{ color: '#eaf1ff' }}>{volatilityRisk}</b>
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Operator Interpretation</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Narrative tone currently leans <b style={{ color: '#eaf1ff' }}>{marketBias}</b>. Maintain tactical flexibility if mixed headlines expand or if momentum narratives fade.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginTop: 12 }}>
        <SectionCard title="Narrative Drivers / Macro Context">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Capital Flows</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                ETF-driven inflow narrative remains dominant in BTC and continues to frame market leadership.
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Infrastructure Stress</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Elevated on-chain activity and gas spikes suggest pockets of speculative overheating in high-beta segments.
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Scenario / Watchlist / Reaction Context">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Base Scenario</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Positive trend continuation with selective volatility events around narrative-heavy assets.
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Watchlist Triggers</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Track sudden sentiment flips, congestion-driven stress headlines, and abrupt leader rotation from BTC into speculative clusters.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard
          title="Market Interpretation"
          text="Newsflow signals constructive risk appetite with localized overheating risk. Momentum remains favorable, but narrative fragility can accelerate short-term reversals."
          source="News intelligence layer"
        />
        <InsightCard
          title="Operator Action Guidance"
          text="Prefer high-conviction setups aligned with dominant flow narratives. Tighten risk controls when mixed headlines increase or volatility risk rises beyond current baseline."
          source="Operator protocol"
        />
      </div>
    </div>
  );
};

export default NewsIntelligencePage;
