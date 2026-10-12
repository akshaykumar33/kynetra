import { z } from 'zod';

/** The four looks a home can have. Each sets the floor, light and default furniture. */
export const HOME_STYLES = ['cabin', 'loft', 'jungle', 'neon'] as const;
export type HomeStyle = (typeof HOME_STYLES)[number];

export const HOME_STYLE_LABEL: Record<HomeStyle, string> = {
  cabin: 'Cozy cabin',
  loft: 'Minimal loft',
  jungle: 'Jungle studio',
  neon: 'Neon den',
};

/** Furniture you can place. Each has a fixed spot in the room so any mix looks arranged. */
export const HOME_ITEMS = [
  'sofa',
  'desk',
  'bookshelf',
  'plants',
  'fireplace',
  'records',
  'aquarium',
  'telescope',
  'rug',
  'lamp',
] as const;
export type HomeItem = (typeof HOME_ITEMS)[number];

export const HOME_ITEM_LABEL: Record<HomeItem, string> = {
  sofa: 'Sofa',
  desk: 'Desk',
  bookshelf: 'Bookshelf',
  plants: 'Plants',
  fireplace: 'Fireplace',
  records: 'Record player',
  aquarium: 'Aquarium',
  telescope: 'Telescope',
  rug: 'Rug',
  lamp: 'Floor lamp',
};

export const HomeDecorSchema = z.object({
  style: z.enum(HOME_STYLES),
  wall: z.string().regex(/^#[0-9a-f]{6}$/i, 'a #rrggbb colour'),
  items: z.array(z.enum(HOME_ITEMS)).max(HOME_ITEMS.length),
});
export type HomeDecor = z.infer<typeof HomeDecorSchema>;

const STYLE_DEFAULTS: Record<HomeStyle, HomeDecor> = {
  cabin: { style: 'cabin', wall: '#c8a27a', items: ['sofa', 'fireplace', 'bookshelf', 'rug', 'lamp'] },
  loft: { style: 'loft', wall: '#e9e6e1', items: ['sofa', 'desk', 'plants', 'lamp'] },
  jungle: { style: 'jungle', wall: '#a9c79b', items: ['plants', 'aquarium', 'rug', 'desk'] },
  neon: { style: 'neon', wall: '#2b2246', items: ['sofa', 'records', 'telescope', 'lamp'] },
};

/** A style's starting look. New homes get the cabin until their owner changes it. */
export function decorFor(style: HomeStyle = 'cabin'): HomeDecor {
  const d = STYLE_DEFAULTS[style];
  return { ...d, items: [...d.items] };
}

/** Reads stored decor, falling back to the default if it is missing or from an older shape. */
export function readDecor(stored: unknown): HomeDecor {
  const parsed = HomeDecorSchema.safeParse(stored);
  if (!parsed.success) return decorFor();
  return { ...parsed.data, items: [...new Set(parsed.data.items)] };
}

/** What time of day the windows show, from the viewer's local hour. */
export type DayPhase = 'morning' | 'day' | 'golden' | 'night';
export function dayPhase(hour: number): DayPhase {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'golden';
  return 'night';
}

/** Guestbook notes: short, plain text, and at most a few per visitor per hour. */
export const NOTE_MAX = 280;
export const NOTES_PER_HOUR = 5;
export const NoteSchema = z.object({
  text: z.string().trim().min(1, 'Write something first').max(NOTE_MAX, `Keep it under ${NOTE_MAX} characters`),
});
