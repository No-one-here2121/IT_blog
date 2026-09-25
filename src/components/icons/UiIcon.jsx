import * as LucideIcons from "lucide-react";

/**
 * Registry of normalized icon names to Lucide Icon components.
 */
const ICON_MAP = {
  search: LucideIcons.Search,
  bell: LucideIcons.Bell,
  bookmark: LucideIcons.Bookmark,
  heart: LucideIcons.Heart,
  message: LucideIcons.MessageSquare,
  comment: LucideIcons.MessageSquare,
  comments: LucideIcons.MessageCircle,
  compass: LucideIcons.Compass,
  code: LucideIcons.Code,
  terminal: LucideIcons.Terminal,
  share: LucideIcons.Share2,
  sun: LucideIcons.Sun,
  moon: LucideIcons.Moon,
  filter: LucideIcons.Filter,
  sparkles: LucideIcons.Sparkles,
  trending: LucideIcons.TrendingUp,
  flame: LucideIcons.Flame,
  fire: LucideIcons.Flame,
  star: LucideIcons.Star,
  tag: LucideIcons.Tag,
  tags: LucideIcons.Tags,
  book: LucideIcons.BookOpen,
  course: LucideIcons.BookOpen,
  courses: LucideIcons.GraduationCap,
  map: LucideIcons.Map,
  roadmap: LucideIcons.Milestone,
  roadmaps: LucideIcons.Milestone,
  job: LucideIcons.Briefcase,
  jobs: LucideIcons.Briefcase,
  quiz: LucideIcons.HelpCircle,
  pencil: LucideIcons.PenTool,
  edit: LucideIcons.Edit3,
  trash: LucideIcons.Trash2,
  eye: LucideIcons.Eye,
  clock: LucideIcons.Clock,
  check: LucideIcons.Check,
  checkCircle: LucideIcons.CheckCircle2,
  alert: LucideIcons.AlertCircle,
  close: LucideIcons.X,
  x: LucideIcons.X,
  chevronRight: LucideIcons.ChevronRight,
  chevronDown: LucideIcons.ChevronDown,
  chevronLeft: LucideIcons.ChevronLeft,
  chevronUp: LucideIcons.ChevronUp,
  logout: LucideIcons.LogOut,
  login: LucideIcons.LogIn,
  user: LucideIcons.User,
  users: LucideIcons.Users,
  userPlus: LucideIcons.UserPlus,
  shield: LucideIcons.Shield,
  shieldCheck: LucideIcons.ShieldCheck,
  settings: LucideIcons.Settings,
  arrowUp: LucideIcons.ArrowUp,
  arrowRight: LucideIcons.ArrowRight,
  arrowLeft: LucideIcons.ArrowLeft,
  grid: LucideIcons.LayoutGrid,
  list: LucideIcons.LayoutList,
  sidebar: LucideIcons.Sidebar,
  external: LucideIcons.ExternalLink,
  copy: LucideIcons.Copy,
  zap: LucideIcons.Zap,
  trophy: LucideIcons.Trophy,
  award: LucideIcons.Award,
  download: LucideIcons.Download,
  upload: LucideIcons.Upload,
  refresh: LucideIcons.RefreshCw,
  info: LucideIcons.Info,
  pin: LucideIcons.Pin,
  verified: LucideIcons.BadgeCheck,
};

/**
 * Unified UI Icon component conforming to Lucide standard.
 *
 * @param {string} name - Name of the icon (e.g. "search", "bell", "bookmark", "flame")
 * @param {number|string} size - Pixel size (default: 18)
 * @param {string} className - Additional CSS classes
 * @param {number} strokeWidth - Stroke width (default: 2)
 */
export default function UiIcon({
  name,
  size = 18,
  className = "",
  strokeWidth = 2,
  ...props
}) {
  if (!name) return null;

  const key = String(name).toLowerCase().replace(/[-_]/g, "");
  const FoundComponent = ICON_MAP[name] || ICON_MAP[key] || LucideIcons[name];

  if (!FoundComponent) {
    return <LucideIcons.HelpCircle size={size} strokeWidth={strokeWidth} className={className} {...props} />;
  }

  return <FoundComponent size={size} strokeWidth={strokeWidth} className={className} {...props} />;
}

export { LucideIcons };
