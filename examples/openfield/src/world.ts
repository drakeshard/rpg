import { DeterministicRng } from "@drakeshard/foundation/random";
import type { Decor, Enemy, EnemyDefinition, Grass, Point, Prop, PropType } from './model';

export const WORLD = { width: 1900, height: 1500 };
export const OBJECTIVE_KILLS = 8;
export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  grunt: { id: 'grunt', maxHealth: 75, moveSpeed: 105, damage: 10, attackRange: 66, detectionRange: 340, color: '#7c463d' },
  fast: { id: 'fast', maxHealth: 55, moveSpeed: 148, damage: 7, attackRange: 62, detectionRange: 390, color: '#985c44' },
  heavy: { id: 'heavy', maxHealth: 125, moveSpeed: 75, damage: 16, attackRange: 76, detectionRange: 300, color: '#654552' }
};

function random(seed: number): () => number {
  const rng = new DeterministicRng(seed);
  return () => rng.nextFloat01();
}

const CELL = 128;
export class CollisionGrid {
  private cells = new Map<number, Prop[]>();
  candidates = 0;
  constructor(props: Prop[], decor: Decor[]) {
    for (const p of [...props, ...decor.filter(d => d.type === 'ruin' || d.type === 'camp').map(d => ({ ...d, type: 'wall' as const, hue: 0 }))]) {
      if (p.type === 'bush') continue;
      const key = Math.floor(p.x / CELL) + Math.floor(p.y / CELL) * 32;
      const list = this.cells.get(key);
      if (list) list.push(p); else this.cells.set(key, [p]);
    }
  }
  collides(x: number, y: number, radius: number): boolean {
    this.candidates = 0;
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) {
      const list = this.cells.get(xx + yy * 32);
      if (!list) continue;
      for (const p of list) {
        this.candidates++;
        const min = radius + p.radius * p.scale * (p.type === 'wall' ? .72 : .64);
        const dx = x - p.x, dy = y - p.y;
        if (dx * dx + dy * dy < min * min) return true;
      }
    }
    return false;
  }
}

export interface WorldData { props: Prop[]; decorative: Decor[]; grass: Grass[]; enemies: Enemy[]; grid: CollisionGrid }

export function makeWorld(stress = false): WorldData {
  const rand = random(721943);
  const range = (a: number, b: number) => a + (b - a) * rand();
  const props: Prop[] = [], decorative: Decor[] = [], grass: Grass[] = [], enemies: Enemy[] = [];
  const add = (type: PropType, x: number, y: number, scale = 1) => props.push({ type, x, y, scale, hue: range(-8, 8), radius: type === 'tree' ? 32 : type === 'rock' || type === 'wall' ? 28 : 18 });
  const clearPath = (x: number, y: number) => {
    const pathY = 760 - (x - 450) * .26;
    if (Math.abs(y - pathY) < 85 || Math.hypot(x - 450, y - 760) < 150 || Math.hypot(x - 1660, y - 350) < 105) return true;
    for (const [sx, sy] of [[820, 680], [980, 540], [1120, 760], [1290, 870], [1470, 570], [1370, 1170], [850, 1120], [1640, 980]]) {
      if (Math.hypot(x - sx, y - sy) < 55) return true;
    }
    return false;
  };
  const clusters: Point[] = [{ x: 620, y: 360 }, { x: 880, y: 330 }, { x: 1150, y: 260 }, { x: 780, y: 1150 }, { x: 1180, y: 1260 }, { x: 1450, y: 1050 }];
  for (const c of clusters) for (let i = 0; i < (stress ? 52 : 18); i++) {
    const x = Math.max(90, Math.min(WORLD.width - 90, c.x + range(-190, 190)));
    const y = Math.max(90, Math.min(WORLD.height - 90, c.y + range(-160, 160)));
    if (!clearPath(x, y)) add(rand() < .66 ? 'tree' : rand() < .75 ? 'rock' : 'bush', x, y, range(.78, 1.28));
  }
  for (let i = 0; i < (stress ? 180 : 35); i++) {
    const x = range(100, WORLD.width - 100), y = range(100, WORLD.height - 100);
    if (!clearPath(x, y)) add(rand() < .6 ? 'bush' : 'rock', x, y, range(.7, 1.2));
  }
  if (stress) for (let attempts = 0; props.length < 484 && attempts < 3000; attempts++) {
    const x = range(100, WORLD.width - 100), y = range(100, WORLD.height - 100);
    if (!clearPath(x, y)) add(rand() < .6 ? 'bush' : 'rock', x, y, range(.7, 1.2));
  }
  for (let i = 0; i < 5; i++) add('log', 650 + i * 78, 1010 + (i % 2) * 32, .85);
  for (let i = 0; i < 4; i++) add('crate', 1320 + i * 54, 795 + (i % 2) * 45, 1);
  for (let i = 0; i < 3; i++) add('barrel', 1450 + i * 38, 885, 1);
  for (let i = 0; i < 4; i++) add('wall', 1510 + i * 58, 260, 1.1);
  decorative.push(
    { type: 'camp', x: 1180, y: 1090, radius: 42, scale: 1 },
    { type: 'campfire', x: 1320, y: 945, radius: 20, scale: 1 },
    { type: 'chest', x: 1180, y: 850, radius: 22, scale: 1 },
    { type: 'chest', x: 1510, y: 520, radius: 22, scale: 1 },
    { type: 'totem', x: 760, y: 260, radius: 26, scale: 1 },
    { type: 'ruin', x: 1610, y: 320, radius: 58, scale: 1.2 },
    { type: 'objective', x: 1710, y: 350, radius: 26, scale: 1 }
  );
  for (let i = 0; i < (stress ? 350 : 180); i++) grass.push({ x: range(50, WORLD.width - 50), y: range(50, WORLD.height - 50), size: range(4, 10) });
  const spawns: [number, number, string][] = [
    [820, 680, 'grunt'], [980, 540, 'fast'], [1120, 760, 'grunt'], [1290, 870, 'heavy'],
    [1470, 570, 'fast'], [1370, 1170, 'heavy'], [850, 1120, 'grunt'], [1640, 980, 'grunt']
  ];
  if (stress) for (let i = spawns.length; i < 50; i++) spawns.push([range(630, 1780), range(170, 1330), i % 5 === 0 ? 'heavy' : 'grunt']);
  spawns.forEach(([x, y, kind], id) => {
    const definition = ENEMY_DEFINITIONS[kind];
    enemies.push({ id, x, y, z: 0, radius: 23, hp: definition.maxHealth, maxHp: definition.maxHealth,
      hitFlash: 0, definition, homeX: x, homeY: y, state: 'IDLE', stateTime: 0, facingX: -1, facingY: 0,
      attackCooldown: range(0, .8), dead: false, deathTimer: 0, wanderAngle: rand() * Math.PI * 2,
      wanderTimer: range(1.2, 3.5), lastAttackSeen: -1, aiTimer: range(0, .15), alertTargetX: x, alertTargetY: y,
      stepTime: 0, alertTimer: 0, attackWindup: 0, attackAnim: 0, barTimer: 0 });
  });
  return { props, decorative, grass, enemies, grid: new CollisionGrid(props, decorative) };
}
