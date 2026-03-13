import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Curve {
  variant: string;
  equityCurve: number[];
}

interface Props {
  curves: Curve[];
}

// Compute drawdown sequence from equity curve
function computeDrawdown(equityCurve: number[]): number[] {
  let peak = -Infinity;
  return equityCurve.map(equity => {
    peak = Math.max(peak, equity);
    return Math.min(0, equity - peak);
  });
}

export const DrawdownChart: React.FC<Props> = ({ curves }) => {
  const maxLen = Math.max(...curves.map(c => c.equityCurve.length));
  const data = Array.from({ length: maxLen }).map((_, i) => {
    const point: any = { step: i };
    curves.forEach((c) => {
      const ddCurve = computeDrawdown(c.equityCurve);
      point[c.variant] = ddCurve[i] !== undefined ? ddCurve[i] : null;
    });
    return point;
  });
  return (
    <div style={{ background: '#191a1b', padding: 16, borderRadius: 8, marginBottom: 32 }}>
      <h3 style={{ color: '#d1d5db', fontFamily: 'monospace' }}>Drawdown</h3>
      <ResponsiveContainer width="100%" height={220}>
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
