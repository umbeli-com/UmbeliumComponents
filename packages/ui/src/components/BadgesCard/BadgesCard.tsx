import { Trophy, Flame, Rocket, Star, Heart, Award } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'trophy' | 'flame' | 'rocket' | 'star' | 'heart' | 'ribbon';
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

interface BadgesCardProps {
  currentStreak: number;
  totalPosts: number;
  weeklyGoalMet: number;
  t: (key: string) => string;
}

const getBadges = (currentStreak: number, totalPosts: number, weeklyGoalMet: number, t: (key: string) => string): Badge[] => {
  return [
    {
      id: 'first-post',
      name: t('badges.firstStep'),
      description: t('badges.firstStepDesc'),
      icon: 'star',
      unlocked: totalPosts >= 1,
      progress: Math.min(totalPosts, 1),
      maxProgress: 1,
    },
    {
      id: 'streak-3',
      name: t('badges.onTrack'),
      description: t('badges.onTrackDesc'),
      icon: 'flame',
      unlocked: currentStreak >= 3,
      progress: Math.min(currentStreak, 3),
      maxProgress: 3,
    },
    {
      id: 'streak-7',
      name: t('badges.perfectWeek'),
      description: t('badges.perfectWeekDesc'),
      icon: 'trophy',
      unlocked: currentStreak >= 7,
      progress: Math.min(currentStreak, 7),
      maxProgress: 7,
    },
    {
      id: 'posts-10',
      name: t('badges.productive'),
      description: t('badges.productiveDesc'),
      icon: 'rocket',
      unlocked: totalPosts >= 10,
      progress: Math.min(totalPosts, 10),
      maxProgress: 10,
    },
    {
      id: 'posts-50',
      name: t('badges.creator'),
      description: t('badges.creatorDesc'),
      icon: 'heart',
      unlocked: totalPosts >= 50,
      progress: Math.min(totalPosts, 50),
      maxProgress: 50,
    },
    {
      id: 'weekly-4',
      name: t('badges.regular'),
      description: t('badges.regularDesc'),
      icon: 'ribbon',
      unlocked: weeklyGoalMet >= 4,
      progress: Math.min(weeklyGoalMet, 4),
      maxProgress: 4,
    },
  ];
};

const BadgeIcon = ({ icon, unlocked }: { icon: Badge['icon']; unlocked: boolean }) => {
  const color = unlocked ? '#eab308' : '#9ca3af';
  switch (icon) {
    case 'trophy': return <Trophy size={24} color={color} />;
    case 'flame': return <Flame size={24} color={color} />;
    case 'rocket': return <Rocket size={24} color={color} />;
    case 'star': return <Star size={24} color={color} />;
    case 'heart': return <Heart size={24} color={color} />;
    case 'ribbon': return <Award size={24} color={color} />;
    default: return <Star size={24} color={color} />;
  }
};

export function BadgesCard({ currentStreak, totalPosts, weeklyGoalMet, t }: BadgesCardProps) {
  const badges = getBadges(currentStreak, totalPosts, weeklyGoalMet, t);
  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="badges-card">
      <div className="badges-card__header">
        <h3 className="badges-card__title">{t('badges.title')}</h3>
        <span className="badges-card__count">{unlockedCount}/{badges.length}</span>
      </div>

      <div className="badges-card__grid">
        {badges.map((badge) => (
          <div 
            key={badge.id} 
            className={`badges-card__badge ${badge.unlocked ? 'badges-card__badge--unlocked' : ''}`}
            title={badge.description}
          >
            <div className="badges-card__badge-icon">
              <BadgeIcon icon={badge.icon} unlocked={badge.unlocked} />
            </div>
            <span className="badges-card__badge-name">{badge.name}</span>
            {!badge.unlocked && badge.progress !== undefined && (
              <div className="badges-card__badge-progress">
                <div 
                  className="badges-card__badge-progress-fill"
                  style={{ width: `${(badge.progress / (badge.maxProgress || 1)) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BadgesCard;
