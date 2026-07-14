export type TabKind = "built-in" | "page" | "external";
export type TabMap = { glyph: string; landmark: string; x: number; y: number; color: string; title: string; zhTitle: string; description: string; zhDescription: string };
export type TabConfig = { id: string; kind: TabKind; label: string; zh: string; href: string; visible: boolean; order: number; map: TabMap };
export function validateTabsConfig(value: unknown): { tabs: TabConfig[] };
export function getCustomPageSlug(tab: TabConfig): string | null;
