import * as IonIcons from 'react-ionicons';
// Styles are imported separately via @umbeli/ui/styles

interface IonIconProps {
  color?: string;
  width?: string;
  height?: string;
}

const iconMap: Record<string, React.ComponentType<IonIconProps>> = {
  // Navigation
  'grid-outline': IonIcons.GridOutline,
  'create-outline': IonIcons.CreateOutline,
  'rocket-outline': IonIcons.RocketOutline,
  'calendar-outline': IonIcons.CalendarOutline,
  'bar-chart-outline': IonIcons.BarChartOutline,
  'settings-outline': IonIcons.SettingsOutline,
  
  // Actions
  'menu-outline': IonIcons.MenuOutline,
  'search-outline': IonIcons.SearchOutline,
  'notifications-outline': IonIcons.NotificationsOutline,
  'add-outline': IonIcons.AddOutline,
  'close-outline': IonIcons.CloseOutline,
  'checkmark-outline': IonIcons.CheckmarkOutline,
  'arrow-up-outline': IonIcons.ArrowUpOutline,
  'arrow-down-outline': IonIcons.ArrowDownOutline,
  'chevron-forward-outline': IonIcons.ChevronForwardOutline,
  'chevron-back-outline': IonIcons.ChevronBackOutline,
  
  // Content
  'eye-outline': IonIcons.EyeOutline,
  'document-text-outline': IonIcons.DocumentTextOutline,
  'chatbubble-outline': IonIcons.ChatbubbleOutline,
  'chatbubbles-outline': IonIcons.ChatbubblesOutline,
  'flame-outline': IonIcons.FlameOutline,
  'phone-portrait-outline': IonIcons.PhonePortraitOutline,
  'camera-outline': IonIcons.CameraOutline,
  'videocam-outline': IonIcons.VideocamOutline,
  'image-outline': IonIcons.ImageOutline,
  'images-outline': IonIcons.ImagesOutline,
  'play-outline': IonIcons.PlayOutline,
  'pause-outline': IonIcons.PauseOutline,
  
  // Social
  'logo-tiktok': IonIcons.LogoTiktok,
  'logo-instagram': IonIcons.LogoInstagram,
  'logo-youtube': IonIcons.LogoYoutube,
  'logo-linkedin': IonIcons.LogoLinkedin,
  'logo-twitter': IonIcons.LogoTwitter,
  'logo-facebook': IonIcons.LogoFacebook,
  'logo-pinterest': IonIcons.LogoPinterest,
  
  // Status
  'checkmark-circle-outline': IonIcons.CheckmarkCircleOutline,
  'alert-circle-outline': IonIcons.AlertCircleOutline,
  'information-circle-outline': IonIcons.InformationCircleOutline,
  'warning-outline': IonIcons.WarningOutline,
  'time-outline': IonIcons.TimeOutline,
  
  // Coach / Strategy
  'bulb-outline': IonIcons.BulbOutline,
  'trophy-outline': IonIcons.TrophyOutline,
  'trending-up-outline': IonIcons.TrendingUpOutline,
  'trending-down-outline': IonIcons.TrendingDownOutline,
  'analytics-outline': IonIcons.AnalyticsOutline,
  'pulse-outline': IonIcons.PulseOutline,
  'flash-outline': IonIcons.FlashOutline,
  'star-outline': IonIcons.StarOutline,
  'heart-outline': IonIcons.HeartOutline,
  'thumbs-up-outline': IonIcons.ThumbsUpOutline,
  
  // Settings
  'person-outline': IonIcons.PersonOutline,
  'people-outline': IonIcons.PeopleOutline,
  'card-outline': IonIcons.CardOutline,
  'wallet-outline': IonIcons.WalletOutline,
  'link-outline': IonIcons.LinkOutline,
  'sync-outline': IonIcons.SyncOutline,
  'globe-outline': IonIcons.GlobeOutline,
  'moon-outline': IonIcons.MoonOutline,
  'sunny-outline': IonIcons.SunnyOutline,
  
  // Misc
  'copy-outline': IonIcons.CopyOutline,
  'share-outline': IonIcons.ShareOutline,
  'download-outline': IonIcons.DownloadOutline,
  'trash-outline': IonIcons.TrashOutline,
  'pencil-outline': IonIcons.PencilOutline,
  'ellipsis-horizontal-outline': IonIcons.EllipsisHorizontalOutline,
  'filter-outline': IonIcons.FilterOutline,
  'options-outline': IonIcons.OptionsOutline,
  'refresh-outline': IonIcons.RefreshOutline,
  'send-outline': IonIcons.SendOutline,
  'happy-outline': IonIcons.HappyOutline,
  'pricetag-outline': IonIcons.PricetagOutline,
  
  // Additional icons for templates/content
  'book-outline': IonIcons.BookOutline,
  'reader-outline': IonIcons.ReaderOutline,
  'list-outline': IonIcons.ListOutline,
  'film-outline': IonIcons.FilmOutline,
};

interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  className?: string;
}

export function Icon({ name, size = 20, color = 'currentColor', className = '' }: IconProps) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return <span className={`icon icon--missing ${className}`}>?</span>;
  }

  const sizeStr = typeof size === 'number' ? `${size}px` : size;

  return (
    <span className={`icon ${className}`}>
      <IconComponent color={color} width={sizeStr} height={sizeStr} />
    </span>
  );
}

export default Icon;
