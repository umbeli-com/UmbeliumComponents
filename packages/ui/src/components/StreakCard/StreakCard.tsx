import { Flame, Trophy, Rocket } from 'lucide-react';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  postsThisWeek: number;
  weeklyGoal: number;
  lastPostDate?: Date;
  t: (key: string) => string;
}

export function StreakCard({ 
  currentStreak, 
  longestStreak, 
  postsThisWeek, 
  weeklyGoal,
  lastPostDate,
  t 
}: StreakCardProps) {
  const progress = Math.min((postsThisWeek / weeklyGoal) * 100, 100);
  const isOnFire = currentStreak >= 3;
  const isGoalMet = postsThisWeek >= weeklyGoal;
  
  const getMotivationMessage = () => {
    if (isGoalMet) return t('dashboard.goalMet');
    if (currentStreak === 0) return t('dashboard.startStreak');
    if (currentStreak >= 7) return t('dashboard.weekComplete');
    if (currentStreak >= 3) return t('dashboard.goodRegularity');
    return t('dashboard.postsLeft').replace('${count}', (weeklyGoal - postsThisWeek).toString()).replace('${count > 1 ? \'s\' : \'\'}', weeklyGoal - postsThisWeek > 1 ? 's' : '');
  };

  const getDaysSinceLastPost = () => {
    if (!lastPostDate) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return t('dashboard.today');
    if (diff === 1) return t('dashboard.yesterday');
    return t('dashboard.daysAgo').replace('${count}', diff.toString());
  };

  return (
    <div className={`streak-card ${isOnFire ? 'streak-card--on-fire' : ''}`}>
      <div className="streak-card__header">
        <div className="streak-card__icon-wrapper">
          <Flame 
            size={28}
            color={isOnFire ? "#ef4444" : "#9ca3af"} 
          />
        </div>
        <div className="streak-card__title-group">
          <h3 className="streak-card__title">{t('dashboard.streakTitle')}</h3>
          <span className="streak-card__subtitle">{getMotivationMessage()}</span>
        </div>
      </div>

      <div className="streak-card__stats">
        <div className="streak-card__stat streak-card__stat--main">
          <span className="streak-card__stat-value">{currentStreak}</span>
          <span className="streak-card__stat-label">{t('dashboard.currentStreakLabel')}</span>
        </div>
        
        <div className="streak-card__stat">
          <Trophy size={18} color="#eab308" />
          <span className="streak-card__stat-value">{longestStreak}</span>
          <span className="streak-card__stat-label">{t('dashboard.recordLabel')}</span>
        </div>
        
        <div className="streak-card__stat">
          <Rocket size={18} color="#3b82f6" />
          <span className="streak-card__stat-value">{postsThisWeek}/{weeklyGoal}</span>
          <span className="streak-card__stat-label">{t('dashboard.thisWeekLabel')}</span>
        </div>
      </div>

      <div className="streak-card__progress">
        <div className="streak-card__progress-header">
          <span>{t('dashboard.weeklyGoalLabel')}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="streak-card__progress-bar">
          <div 
            className={`streak-card__progress-fill ${isGoalMet ? 'streak-card__progress-fill--complete' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {lastPostDate && (
        <div className="streak-card__last-post">
          {t('dashboard.lastPostLabel').replace('${time}', getDaysSinceLastPost() || '')}
        </div>
      )}
    </div>
  );
}

export default StreakCard;
