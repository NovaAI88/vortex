import React from 'react';

const news = [
  {
    title: 'Bitcoin surges above $66k as ETF inflows continue',
    source: 'CoinDesk',
    date: '3min ago'
  },
  {
    title: 'ETH gas fees spike amid DeFi boom',
    source: 'The Block',
    date: '12min ago'
  },
  {
    title: 'Solana upgrades bring order book to DeFi',
    source: 'Solana News',
    date: '27min ago'
  }
];

const NewsPanel: React.FC = () => (
  <div style={{ background:'#181e2b',borderRadius:12,padding:'20px 22px',color:'#d0e8ff',boxShadow:'0 1px 12px #0001',marginBottom:10,minHeight:110 }}>
    <div style={{fontWeight:700,fontSize:17,color:'#6bc1ff',letterSpacing:'-0.4px',marginBottom:8}}>Market News</div>
    {news.map((n,i) => (
      <div key={i} style={{marginBottom:7,lineHeight:1.23}}>
        <span style={{fontWeight:600,color:'#b6eaff',marginRight:4}}>{n.title}</span>
        <span style={{color:'#7da1c6',fontSize:'0.8em',fontWeight:400}}>- {n.source} · {n.date}</span>
      </div>
    ))}
  </div>
);

export default NewsPanel;
