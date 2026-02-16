import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

interface DetailedChartProps {
  data: DataPoint[];
  series: ChartSeries[];
  type?: 'line' | 'area' | 'bar';
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  title?: string;
}

export function DetailedChart({ 
  data, 
  series, 
  type = 'line', 
  height = 300,
  showGrid = true,
  showLegend = true,
  title
}: DetailedChartProps) {

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    if (type === 'area') {
      return (
        <AreaChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#7E8594" />
          <YAxis tick={{ fontSize: 12 }} stroke="#7E8594" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--theme-color-neutral-surface-alt)', 
              border: '1px solid var(--theme-color-neutral-border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }} 
          />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Area 
              key={s.key}
              type="monotone" 
              dataKey={s.key} 
              name={s.name}
              stroke={s.color} 
              fill={s.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      );
    }

    if (type === 'bar') {
      return (
        <BarChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#7E8594" />
          <YAxis tick={{ fontSize: 12 }} stroke="#7E8594" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--theme-color-neutral-surface-alt)', 
              border: '1px solid var(--theme-color-neutral-border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }} 
          />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Bar 
              key={s.key}
              dataKey={s.key} 
              name={s.name}
              fill={s.color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#7E8594" />
        <YAxis tick={{ fontSize: 12 }} stroke="#7E8594" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--theme-color-neutral-surface-alt)', 
            border: '1px solid var(--theme-color-neutral-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }} 
        />
        {showLegend && <Legend />}
        {series.map((s) => (
          <Line 
            key={s.key}
            type="monotone" 
            dataKey={s.key} 
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ fill: s.color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <div className="detailed-chart">
      {title && <h4 className="detailed-chart__title">{title}</h4>}
      <div className="detailed-chart__container" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default DetailedChart;
