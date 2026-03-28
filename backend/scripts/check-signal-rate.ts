type TriggerModeMetrics = {
  completed: number;
  successRate: number;
  avgMfePct: number;
  avgMaePct: number;
};

type SignalMetricsResponse = {
  totals: {
    tracked: number;
    active: number;
    completed: number;
  };
  rates: {
    successRate: number;
  };
  byTriggerMode: {
    rsi_extreme: TriggerModeMetrics;
    context_confirmed: TriggerModeMetrics;
  };
};

const BASE_URL = 'http://localhost:3000';
const UNREACHABLE_MESSAGE = `VORTEX server not running at ${BASE_URL}`;

function toPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function line(label: string, value: string): string {
  return `${label.padEnd(19, ' ')}${value}`;
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }
  return response.json();
}

async function run(): Promise<void> {
  try {
    const metrics = (await fetchJson('/api/performance/signal-metrics')) as SignalMetricsResponse;
    await fetchJson('/api/performance/signal-tracks');

    console.log('=== VORTEX Signal Performance ===');
    console.log(line('Total tracked:', String(metrics.totals.tracked)));
    console.log(line('Active:', String(metrics.totals.active)));
    console.log(line('Completed:', String(metrics.totals.completed)));
    console.log(line('Overall success:', toPercent(metrics.rates.successRate)));
    console.log('');
    console.log('--- By Trigger Mode ---');

    const rsi = metrics.byTriggerMode.rsi_extreme;
    console.log(
      line(
        'rsi_extreme:',
        `${rsi.completed} completed | ${toPercent(rsi.successRate)} success | MFE ${toPercent(rsi.avgMfePct)} | MAE ${toPercent(rsi.avgMaePct)}`,
      ),
    );

    const context = metrics.byTriggerMode.context_confirmed;
    console.log(
      line(
        'context_confirmed:',
        `${context.completed} completed | ${toPercent(context.successRate)} success | MFE ${toPercent(context.avgMfePct)} | MAE ${toPercent(context.avgMaePct)}`,
      ),
    );
  } catch (error) {
    console.error(UNREACHABLE_MESSAGE);
    process.exitCode = 1;
  }
}

run();
