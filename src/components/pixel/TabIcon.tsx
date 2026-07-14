import {
  BookOpen,
  FlaskConical,
  FolderKanban,
  Home,
  MapPin,
  Radio,
  User,
  type LucideIcon
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  home: Home,
  user: User,
  "book-open": BookOpen,
  radio: Radio,
  "folder-kanban": FolderKanban,
  "flask-conical": FlaskConical,
  "map-pin": MapPin
};

export function TabIcon({ name }: { name?: string }) {
  const Icon = icons[name ?? ""] ?? MapPin;
  return <Icon aria-hidden="true" size={18} strokeWidth={2.2} />;
}
