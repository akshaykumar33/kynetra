import type { InteractiveNodeType, WorldDistrict } from '@kynetra/contracts';

/** User-facing names for contract enums — raw enum values are never shown (§13.2 Copy). */
export const NODE_TYPE_LABEL: Record<InteractiveNodeType, string> = {
  terminal: 'Terminal',
  receptionist_npc: 'AI receptionist',
  whiteboard: 'Whiteboard',
  coding_pod: 'Coding pod',
  cloud_lab_rack: 'Cloud lab rack',
  portal: 'Portal',
};

export const DISTRICT_STATUS_LABEL: Record<WorldDistrict['status'], string> = {
  active: 'Operational',
  in_construction: 'Under construction',
  planned: 'Planned',
};

const numberFormat = new Intl.NumberFormat('en');
export const formatCount = (value: number) => numberFormat.format(value);

const timeFormat = new Intl.DateTimeFormat('en', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
export const formatTime = (epochMs: number) => timeFormat.format(epochMs);
