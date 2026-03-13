import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Curve {
  variant: string;
  equityCurve: number[];
}

interface Props {
  curves: Curve[];
}

export const EquityCurveChart: React.FC<Props> = ({ curves }) => {
  // Compute maximal length for series alignment
  const maxLen = Math.max(...curves.map(c => c.equityCurve.length));
  const data = Array.from({ length: maxLen }).map((_, i) => {
    const point: any = { step: i };
    curves.forEach((c) => {
      point[c.variant] = c.equityCurve[i] !== undefined ? c.equityCurve[i] : null;
    });
    return point;
  });
  return (
    <div style={{ background: '#191a1b', padding: 16, borderRadius: 8, marginBottom: 32 }}>
      <h3 style={{ color: '#d1d5db', fontFamily: 'monospace' }}>Equity Curve</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="step" stroke="#cccccc" />
          <YAxis stroke="#cccccc" />
          <Tooltip />
          <Legend />
          {curves.map(c => (
            <Line
              key={c.variant}
              type="monotone"
              dataKey={c.variant}
              stroke={stringToColor(c.variant)}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Color generator for consistent, readable lines
function stringToColor(str: string): string {
  let hash = 0;
  for (let i=0; i<str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
  let color = '#';
  for (let i=0; i<3; i++) {
    const value = (hash >> (i*8)) & 0xff;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}
