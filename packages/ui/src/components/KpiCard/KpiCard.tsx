import { Icon } from '@umbeli-com/ui';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function KpiCard({ label, value, icon, trend, className = '' }: KpiCardProps) {
  const getTrendClass = () => {
    if (!trend) return '';
    return trend.direction === 'up' 
      ? 'kpi-card__trend--up' 
      : trend.direction === 'down' 
        ? 'kpi-card__trend--down' 
        : '';
  };

  const renderTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp size={14} />;
    if (trend.direction === 'down') return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  return (
    <div className={`kpi-card ${className}`}>
      <div className="kpi-card__header">
        {icon && <span className="kpi-card__icon"><Icon name={icon} size={24} /></span>}
        <span className="kpi-card__label">{label}</span>
      </div>
      <div className="kpi-card__body">
        <span className="kpi-card__value">{value}</span>
        {trend && (
          <span className={`kpi-card__trend ${getTrendClass()}`}>
            <span className="kpi-card__trend-icon">{renderTrendIcon()}</span>
            <span className="kpi-card__trend-value">{Math.abs(trend.value)}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default KpiCard;
