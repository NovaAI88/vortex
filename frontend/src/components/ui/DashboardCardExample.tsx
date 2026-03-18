import React from 'react';
import DashboardCard from './DashboardCard';

/**
 * Example component showing different uses of DashboardCard.
 * This is for demonstration purposes.
 */
const DashboardCardExample: React.FC = () => {
  const handleCardClick = (cardName: string) => {
    console.log(`DashboardCard clicked: ${cardName}`);
    alert(`You clicked the ${cardName} card!`);
  };

  return (
    <div style={{ padding: 24, background: '#171b22', minHeight: '100vh' }}>
      <h1 style={{ color: '#eef4ff', marginBottom: 24 }}>DashboardCard Examples</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
        maxWidth: 1200,
        marginBottom: 40 
      }}>
        {/* Basic card */}
        <DashboardCard
          title="Total Revenue"
          value="$124,580"
          subtitle="Year-to-date"
        />
        
        {/* Card with trend */}
        <DashboardCard
          title="New Users"
          value="2,847"
          subtitle="This month"
          trend="up"
          trendValue="+12.3%"
        />
        
        {/* Interactive card */}
        <DashboardCard
          title="Growth Rate"
          value="24.3%"
          subtitle="Quarter over quarter"
          trend="up"
          trendValue="+5.1%"
          interactive
          onClick={() => handleCardClick('Growth Rate')}
        />
        
        {/* Card with icon */}
        <DashboardCard
          title="Active Sessions"
          value="1,243"
          subtitle="Current"
          icon={<span>👥</span>}
          trend="neutral"
          trendValue="0.0%"
        />
        
        {/* Card with footer */}
        <DashboardCard
          title="Conversion Rate"
          value="3.2%"
          subtitle="From leads to customers"
          trend="neutral"
          trendValue="0.0%"
          footer={<div>Target: 4.0% • Last updated: Today</div>}
        />
        
        {/* Custom children */}
        <DashboardCard
          title="Custom Content"
          interactive
          onClick={() => handleCardClick('Custom Content')}
        >
          <div style={{ fontSize: 14, color: '#b7c5df', lineHeight: 1.5 }}>
            This card uses <code>children</code> prop for custom content.
            <div style={{ marginTop: 12, padding: 8, background: '#23273a', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Item A</span>
                <span style={{ color: '#7fee82' }}>✓</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>Item B</span>
                <span style={{ color: '#ff9f9f' }}>✗</span>
              </div>
            </div>
          </div>
        </DashboardCard>
        
        {/* Negative trend */}
        <DashboardCard
          title="Churn Rate"
          value="2.3%"
          subtitle="Monthly average"
          trend="down"
          trendValue="-0.4%"
        />
        
        {/* Minimal card */}
        <DashboardCard
          title="Support Tickets"
          value="42"
          interactive
          onClick={() => handleCardClick('Support Tickets')}
        />
      </div>
      
      <div style={{ 
        background: '#1a2335', 
        borderRadius: 14, 
        padding: 20, 
        border: '1px solid #263653',
        maxWidth: 800 
      }}>
        <h3 style={{ color: '#cde4ff', marginTop: 0 }}>Usage Example</h3>
        <pre style={{ 
          background: '#0f1522', 
          padding: 16, 
          borderRadius: 8, 
          overflowX: 'auto',
          color: '#a7c0e8',
          fontSize: 13,
          lineHeight: 1.4
        }}>
{`import React from 'react';
import DashboardCard from './DashboardCard';

function MyDashboard() {
  return (
    <DashboardCard
      title="Total Revenue"
      value="$124,580"
      subtitle="Year-to-date"
      trend="up"
      trendValue="+24.5%"
      interactive
      onClick={() => console.log('Card clicked')}
    />
  );
}`}
        </pre>
      </div>
    </div>
  );
};

export default DashboardCardExample;