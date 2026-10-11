import { create } from 'zustand';
import type { SelectionIds } from './selection';

export type Lens = 'map' | 'city';

export type CameraCommandType = 'reset' | 'zoom-in' | 'zoom-out' | 'orbit-left' | 'orbit-right';

/** A one-shot request to the 3D camera; `seq` makes repeated presses distinct. */
export interface CameraCommand {
  type: CameraCommandType;
  seq: number;
}

interface WorldViewState extends SelectionIds {
  lens: Lens;
  cameraCommand: CameraCommand | null;
  selectDistrict: (districtId: string) => void;
  selectFloor: (floorNumber: number | null) => void;
  selectNode: (nodeId: string | null) => void;
  /** Jump straight to any level of the hierarchy (quick travel). */
  travelTo: (target: SelectionIds) => void;
  setLens: (lens: Lens) => void;
  sendCameraCommand: (type: CameraCommandType) => void;
}

/**
 * Client-only view state: what the user is looking at and through which lens.
 * World data itself is server state and lives in React Query, never here.
 */
export const useWorldView = create<WorldViewState>((set) => ({
  districtId: null,
  floorNumber: null,
  nodeId: null,
  lens: 'city',
  cameraCommand: null,
  selectDistrict: (districtId) =>
    set((s) => (s.districtId === districtId ? s : { districtId, floorNumber: null, nodeId: null })),
  selectFloor: (floorNumber) => set({ floorNumber, nodeId: null }),
  selectNode: (nodeId) => set({ nodeId }),
  travelTo: ({ districtId, floorNumber, nodeId }) => set({ districtId, floorNumber, nodeId }),
  setLens: (lens) => set({ lens }),
  sendCameraCommand: (type) =>
    set((s) => ({ cameraCommand: { type, seq: (s.cameraCommand?.seq ?? 0) + 1 } })),
}));
