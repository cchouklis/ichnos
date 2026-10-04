import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ComponentInstance, Room, Wall, Wire } from '../models';
import { assignRoomIds, isRoomClosed, pointInPolygon, roomArea, roomIdAt, roomPolygon, scopeToRoom } from './sheet.util.ts';

const wall = (id: string, x1: number, y1: number, x2: number, y2: number): Wall =>
  ({ id, x1, y1, x2, y2, thicknessMm: 120, heightMm: 2700 });
const comp = (id: string, x: number, y: number, roomId?: string | null): ComponentInstance =>
  ({ id, type: 'outlet-single', x, y, rot: 0, circuit: 1, label: id, notes: '', roomId });
const wire = (id: string, a: string, b: string): Wire => ({ id, a, b, circuit: 1 });

// Two rooms sharing the wall w3 (x = 4): A = [0..4], B = [4..8], both 3 m high.
const walls = [
  wall('a1', 0, 0, 4, 0), wall('w3', 4, 0, 4, 3), wall('a3', 4, 3, 0, 3), wall('a4', 0, 3, 0, 0),
  wall('b1', 4, 0, 8, 0), wall('b2', 8, 0, 8, 3), wall('b3', 8, 3, 4, 3),
];
const rooms: Room[] = [
  { id: 'A', label: 'A', wallIds: ['a1', 'w3', 'a3', 'a4'] },
  { id: 'B', label: 'B', wallIds: ['b1', 'b2', 'b3', 'w3'] },
];

test('closed detection: open until the last wall exists, derived not stored', () => {
  assert.equal(isRoomClosed(rooms[0], walls), true);
  assert.equal(isRoomClosed({ id: 'X', label: 'X', wallIds: ['a1', 'w3'] }, walls), false);
  assert.equal(isRoomClosed({ id: 'X', label: 'X', wallIds: [] }, walls), false);
  assert.equal(isRoomClosed({ id: 'X', label: 'X', wallIds: ['a1', 'w3', 'a3'] }, walls), false);
});

test('doors and windows (gaps up to 2.5 m) do not open a room, bigger gaps do', () => {
  const withOpenings = [
    wall('n', 0, 0, 4, 0), wall('e1', 4, 0, 4, 2.1), wall('e2', 4, 3.1, 4, 5), wall('s', 4, 5, 1.6, 5), wall('w', 0, 5, 0, 0),
  ];
  const room: Room = { id: 'R', label: 'R', wallIds: ['n', 'e1', 'e2', 's', 'w'] };
  assert.equal(isRoomClosed(room, withOpenings), true);
  assert.equal(roomIdAt({ x: 2, y: 2.5 }, { rooms: [room], walls: withOpenings }), 'R');
  const wide = [wall('n', 0, 0, 4, 0), wall('e', 4, 0, 4, 5), wall('s', 4, 5, 0.5, 5), wall('w', 0, 2, 0, 0)];
  assert.equal(isRoomClosed({ id: 'W', label: 'W', wallIds: ['n', 'e', 's', 'w'] }, wide), false);
});

test('polygon is chained in walking order even when the wall list is shuffled and flipped', () => {
  const shuffled: Room = { id: 'B', label: 'B', wallIds: ['w3', 'b3', 'b1', 'b2'] };
  const poly = roomPolygon(shuffled, walls);
  assert.equal(poly.length, 4);
  assert.equal(roomArea(shuffled, walls), 12);
  assert.equal(roomArea(rooms[0], walls), 12);
});

test('pointInPolygon', () => {
  const poly = roomPolygon(rooms[0], walls);
  assert.equal(pointInPolygon({ x: 2, y: 1 }, poly), true);
  assert.equal(pointInPolygon({ x: 6, y: 1 }, poly), false);
});

test('roomIdAt: inside, wall-mounted near boundary, outside', () => {
  const doc = { rooms, walls };
  assert.equal(roomIdAt({ x: 2, y: 1 }, doc), 'A');
  assert.equal(roomIdAt({ x: 6, y: 1 }, doc), 'B');
  assert.equal(roomIdAt({ x: 1, y: 0.02 }, doc), 'A'); // on the north wall of A
  assert.equal(roomIdAt({ x: 20, y: 20 }, doc), null);
  assert.equal(roomIdAt({ x: 2, y: -0.9 }, doc), null);
});

test('nested rooms resolve to the inner one', () => {
  const nestedWalls = [
    ...walls.slice(0, 4),
    wall('i1', 1, 1, 2, 1), wall('i2', 2, 1, 2, 2), wall('i3', 2, 2, 1, 2), wall('i4', 1, 2, 1, 1),
  ];
  const nestedRooms: Room[] = [rooms[0], { id: 'I', label: 'I', wallIds: ['i1', 'i2', 'i3', 'i4'] }];
  assert.equal(roomIdAt({ x: 1.5, y: 1.5 }, { rooms: nestedRooms, walls: nestedWalls }), 'I');
});

test('scopeToRoom: own elements, internal wires editable, cross-room wires become stubs', () => {
  const components = [comp('p', 1, 1, 'A'), comp('l', 2, 2, 'A'), comp('o', 6, 1, 'B'), comp('n', 9, 9, null)];
  const wires = [wire('in', 'p', 'l'), wire('cross', 'p', 'o'), wire('far', 'o', 'n')];
  const s = scopeToRoom({ walls, rooms, components, wires }, 'A');
  assert.deepEqual([...s.wallIds].sort(), ['a1', 'a3', 'a4', 'w3']);
  assert.deepEqual([...s.componentIds].sort(), ['l', 'p']);
  assert.deepEqual([...s.wireIds], ['in']);
  assert.deepEqual(s.stubs, [{ wireId: 'cross', insideId: 'p', outsideId: 'o' }]);
});

test('assignRoomIds derives only for components that have no roomId field yet', () => {
  const components = [comp('x', 2, 1), comp('y', 6, 1, null), comp('z', 20, 20)];
  const out = assignRoomIds({ walls, rooms, components, wires: [] });
  assert.equal(out[0].roomId, 'A');
  assert.equal(out[1].roomId, null); // explicitly unassigned stays unassigned
  assert.equal(out[2].roomId, null);
});
