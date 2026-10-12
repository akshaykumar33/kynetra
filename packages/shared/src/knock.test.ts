import { describe, expect, it } from 'vitest';
import { ROOM_DOOR } from './layout';
import { atDoor, nextKnock } from './knock';

const door = { x: ROOM_DOOR.x, z: ROOM_DOOR.z + 1 };
const far = { x: 0, z: 10 };

describe('knock state', () => {
  it('offers a knock when you reach the door', () => {
    expect(atDoor(door.x, door.z)).toBe(true);
    expect(nextKnock('none', door.x, door.z)).toBe('available');
  });
  it('withdraws the offer when you walk away before knocking', () => {
    expect(nextKnock('available', far.x, far.z)).toBe('none');
  });
  it('keeps waiting while you wait at the door', () => {
    expect(nextKnock('waiting', door.x, door.z)).toBe('waiting');
  });
  it('closes the door again once you are well away after being admitted', () => {
    expect(nextKnock('admitted', door.x, door.z)).toBe('admitted');
    expect(nextKnock('admitted', far.x, far.z)).toBe('none');
  });
});
