import {
  LayoutGrid,
  Edit,
  Rocket,
  Calendar,
  BarChart,
  Settings,
  Menu,
  Search,
  Bell,
  Plus,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileText,
  MessageCircle,
  MessagesSquare,
  Flame,
  Smartphone,
  Camera,
  Video,
  Image as ImageIcon,
  ImagePlus,
  Play,
  Pause,
  Music,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Facebook,
  Pin,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Clock,
  Lightbulb,
  Trophy,
  TrendingUp,
  TrendingDown,
  LineChart,
  Activity,
  Zap,
  Star,
  Heart,
  ThumbsUp,
  User,
  Users,
  CreditCard,
  Wallet,
  Link as LinkIcon,
  RefreshCw,
  Globe,
  Moon,
  Sun,
  Copy,
  Share2,
  Download,
  Trash2,
  Pencil,
  MoreHorizontal,
  Filter,
  SlidersHorizontal,
  Send,
  Smile,
  Tag,
  Book,
  BookOpen,
  List,
  Film,
  type LucideIcon,
} from 'lucide-react';

// Styles are imported separately via @umbeli-com/ui/styles

const iconMap: Record<string, LucideIcon> = {
  // Navigation
  'grid-outline': LayoutGrid,
  'create-outline': Edit,
  'rocket-outline': Rocket,
  'calendar-outline': Calendar,
  'bar-chart-outline': BarChart,
  'settings-outline': Settings,

  // Actions
  'menu-outline': Menu,
  'search-outline': Search,
  'notifications-outline': Bell,
  'add-outline': Plus,
  'close-outline': X,
  'checkmark-outline': Check,
  'arrow-up-outline': ArrowUp,
  'arrow-down-outline': ArrowDown,
  'chevron-forward-outline': ChevronRight,
  'chevron-back-outline': ChevronLeft,

  // Content
  'eye-outline': Eye,
  'document-text-outline': FileText,
  'chatbubble-outline': MessageCircle,
  'chatbubbles-outline': MessagesSquare,
  'flame-outline': Flame,
  'phone-portrait-outline': Smartphone,
  'camera-outline': Camera,
  'videocam-outline': Video,
  'image-outline': ImageIcon,
  'images-outline': ImagePlus,
  'play-outline': Play,
  'pause-outline': Pause,

  // Social logos
  'logo-tiktok': Music,
  'logo-instagram': Instagram,
  'logo-youtube': Youtube,
  'logo-linkedin': Linkedin,
  'logo-twitter': Twitter,
  'logo-facebook': Facebook,
  'logo-pinterest': Pin,

  // Social short names used by some consumers
  'facebook': Facebook,
  'instagram': Instagram,
  'linkedin': Linkedin,
  'twitter': Twitter,
  'youtube': Youtube,
  'tiktok': Music,
  'pinterest': Pin,
  'f': Facebook,
  'in': Linkedin,
  'blog': FileText,

  // Status
  'checkmark-circle-outline': CheckCircle,
  'alert-circle-outline': AlertCircle,
  'information-circle-outline': Info,
  'warning-outline': AlertTriangle,
  'time-outline': Clock,

  // Coach / Strategy
  'bulb-outline': Lightbulb,
  'trophy-outline': Trophy,
  'trending-up-outline': TrendingUp,
  'trending-down-outline': TrendingDown,
  'analytics-outline': LineChart,
  'pulse-outline': Activity,
  'flash-outline': Zap,
  'star-outline': Star,
  'heart-outline': Heart,
  'thumbs-up-outline': ThumbsUp,

  // Settings
  'person-outline': User,
  'people-outline': Users,
  'card-outline': CreditCard,
  'wallet-outline': Wallet,
  'link-outline': LinkIcon,
  'sync-outline': RefreshCw,
  'globe-outline': Globe,
  'moon-outline': Moon,
  'sunny-outline': Sun,

  // Misc
  'copy-outline': Copy,
  'share-outline': Share2,
  'download-outline': Download,
  'trash-outline': Trash2,
  'pencil-outline': Pencil,
  'ellipsis-horizontal-outline': MoreHorizontal,
  'filter-outline': Filter,
  'options-outline': SlidersHorizontal,
  'refresh-outline': RefreshCw,
  'send-outline': Send,
  'happy-outline': Smile,
  'pricetag-outline': Tag,

  // Additional icons for templates/content
  'book-outline': Book,
  'reader-outline': BookOpen,
  'list-outline': List,
  'film-outline': Film,
};

interface IconProps {
  name?: string;
  size?: number | string;
  color?: string;
  className?: string;
}

export function Icon({ name, size = 20, color = 'currentColor', className = '' }: IconProps) {
  const IconComponent = name ? iconMap[name] : undefined;

  if (!IconComponent) {
    if (name) {
      console.warn(`Icon "${name}" not found in icon map`);
    }
    return <span className={`icon icon--missing ${className}`}>?</span>;
  }

  const sizeNum = typeof size === 'number' ? size : parseInt(size, 10) || 20;

  return (
    <span className={`icon ${className}`}>
      <IconComponent size={sizeNum} color={color} />
    </span>
  );
}

export default Icon;
