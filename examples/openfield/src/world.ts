import { DeterministicRng } from "@drakeshard/foundation/random";
import type { Decor, Enemy, EnemyDefinition, Grass, Point, Prop, PropType } from "./model";

export const WORLD = { width: 3000, height: 2200 };
export const OBJECTIVE_KILLS = 8;

export interface AreaDefinition {
  id: "greywood" | "fenwatch" | "broken-ruins";
  name: string;
  subtitle: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  mobs: readonly ("grunt" | "fast" | "heavy")[];
  level: number;
}

export const AREAS: readonly AreaDefinition[] = [
  {
    id: "greywood",
    name: "Greywood Outskirts",
    subtitle: "Old road and thornwood",
    minX: 0,
    maxX: 1150,
    minY: 0,
    maxY: WORLD.height,
    mobs: ["grunt", "fast"],
    level: 1,
  },
  {
    id: "fenwatch",
    name: "Fenwatch Mire",
    subtitle: "Sunken watchposts and blackwater",
    minX: 1150,
    maxX: 2100,
    minY: 0,
    maxY: WORLD.height,
    mobs: ["grunt", "fast", "heavy"],
    level: 2,
  },
  {
    id: "broken-ruins",
    name: "Broken Beacon Ruins",
    subtitle: "Ancient wardstones and beacon ash",
    minX: 2100,
    maxX: WORLD.width,
    minY: 0,
    maxY: WORLD.height,
    mobs: ["heavy", "fast", "grunt"],
    level: 3,
  },
];

export function areaAt(x: number, y: number): AreaDefinition {
  return (
    AREAS.find((area) => x >= area.minX && x < area.maxX && y >= area.minY && y <= area.maxY) ??
    AREAS[0]
  );
}

export const ENEMY_DEFINITIONS: Record<"grunt" | "fast" | "heavy", EnemyDefinition> = {
  grunt: {
    id: "grunt",
    maxHealth: 75,
    moveSpeed: 105,
    damage: 10,
    attackRange: 66,
    detectionRange: 340,
    color: "#7c463d",
  },
  fast: {
    id: "fast",
    maxHealth: 55,
    moveSpeed: 148,
    damage: 7,
    attackRange: 62,
    detectionRange: 390,
    color: "#985c44",
  },
  heavy: {
    id: "heavy",
    maxHealth: 125,
    moveSpeed: 75,
    damage: 16,
    attackRange: 76,
    detectionRange: 300,
    color: "#654552",
  },
};

function random(seed: number): () => number {
  const rng = new DeterministicRng(seed);
  return () => rng.nextFloat01();
}

export function createEnemy(
  id: number,
  kind: keyof typeof ENEMY_DEFINITIONS,
  x: number,
  y: number,
  random01: () => number,
  spawnArea = areaAt(x, y).id,
): Enemy {
  const definition = ENEMY_DEFINITIONS[kind];
  return {
    id,
    x,
    y,
    z: 0,
    radius: kind === "heavy" ? 26 : kind === "fast" ? 20 : 23,
    hp: definition.maxHealth,
    maxHp: definition.maxHealth,
    hitFlash: 0,
    definition,
    homeX: x,
    homeY: y,
    spawnArea,
    state: "IDLE",
    stateTime: 0,
    facingX: -1,
    facingY: 0,
    attackCooldown: random01() * 0.8,
    dead: false,
    deathTimer: 0,
    wanderAngle: random01() * Math.PI * 2,
    wanderTimer: 1.2 + random01() * 2.3,
    lastAttackSeen: -1,
    aiTimer: random01() * 0.15,
    alertTargetX: x,
    alertTargetY: y,
    stepTime: 0,
    alertTimer: 0,
    attackWindup: 0,
    attackAnim: 0,
    barTimer: 0,
  };
}

const CELL = 128;
export class CollisionGrid {
  private cells = new Map<number, Prop[]>();
  candidates = 0;

  constructor(props: Prop[], decor: Decor[]) {
    for (const p of [
      ...props,
      ...decor
        .filter((d) => d.type === "ruin" || d.type === "camp")
        .map((d) => ({ ...d, type: "wall" as const, hue: 0 })),
    ]) {
      if (p.type === "bush") continue;
      const key = Math.floor(p.x / CELL) + Math.floor(p.y / CELL) * 64;
      const list = this.cells.get(key);
      if (list) list.push(p);
      else this.cells.set(key, [p]);
    }
  }

  collides(x: number, y: number, radius: number): boolean {
    this.candidates = 0;
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    for (let yy = cy - 1; yy <= cy + 1; yy++) {
      for (let xx = cx - 1; xx <= cx + 1; xx++) {
        const list = this.cells.get(xx + yy * 64);
        if (!list) continue;
        for (const p of list) {
          this.candidates++;
          const min = radius + p.radius * p.scale * (p.type === "wall" ? 0.72 : 0.64);
          const dx = x - p.x;
          const dy = y - p.y;
          if (dx * dx + dy * dy < min * min) return true;
        }
      }
    }
    return false;
  }
}

export interface WorldData {
  props: Prop[];
  decorative: Decor[];
  grass: Grass[];
  enemies: Enemy[];
  grid: CollisionGrid;
}

export function makeWorld(stress = false): WorldData {
  const rand = random(721943);
  const range = (a: number, b: number) => a + (b - a) * rand();
  const props: Prop[] = [];
  const decorative: Decor[] = [];
  const grass: Grass[] = [];
  const enemies: Enemy[] = [];

  const add = (type: PropType, x: number, y: number, scale = 1) =>
    props.push({
      type,
      x,
      y,
      scale,
      hue: range(-8, 8),
      radius: type === "tree" ? 32 : type === "rock" || type === "wall" ? 28 : 18,
    });

  const safeNodes: Point[] = [
    { x: 430, y: 760 },
    { x: 950, y: 680 },
    { x: 1450, y: 980 },
    { x: 1960, y: 780 },
    { x: 2470, y: 610 },
    { x: 2760, y: 420 },
  ];
  const clearPath = (x: number, y: number) => {
    for (const node of safeNodes) {
      if (Math.hypot(x - node.x, y - node.y) < 115) return true;
    }
    const roadY = 760 - (x - 430) * 0.11;
    return Math.abs(y - roadY) < 82;
  };

  const clusters: Point[] = [
    { x: 600, y: 360 },
    { x: 890, y: 1380 },
    { x: 1340, y: 420 },
    { x: 1580, y: 1550 },
    { x: 2040, y: 1250 },
    { x: 2390, y: 420 },
    { x: 2670, y: 1480 },
  ];

  for (const cluster of clusters) {
    for (let i = 0; i < (stress ? 70 : 25); i++) {
      const x = Math.max(90, Math.min(WORLD.width - 90, cluster.x + range(-230, 230)));
      const y = Math.max(90, Math.min(WORLD.height - 90, cluster.y + range(-190, 190)));
      if (!clearPath(x, y)) {
        const roll = rand();
        add(roll < 0.58 ? "tree" : roll < 0.78 ? "rock" : "bush", x, y, range(0.76, 1.34));
      }
    }
  }

  for (let i = 0; i < (stress ? 260 : 70); i++) {
    const x = range(100, WORLD.width - 100);
    const y = range(100, WORLD.height - 100);
    if (!clearPath(x, y)) add(rand() < 0.62 ? "bush" : "rock", x, y, range(0.7, 1.2));
  }

  for (let i = 0; i < 5; i++) add("log", 650 + i * 78, 1010 + (i % 2) * 32, 0.85);
  for (let i = 0; i < 4; i++) add("crate", 1450 + i * 54, 930 + (i % 2) * 45, 1);
  for (let i = 0; i < 3; i++) add("barrel", 1710 + i * 38, 880, 1);
  for (let i = 0; i < 5; i++) add("wall", 2500 + i * 58, 420, 1.1);

  decorative.push(
    { type: "camp", x: 1040, y: 1080, radius: 42, scale: 1 },
    { type: "campfire", x: 1170, y: 1020, radius: 20, scale: 1 },
    { type: "chest", x: 900, y: 520, radius: 22, scale: 1 },
    { type: "totem", x: 1510, y: 420, radius: 26, scale: 1 },
    { type: "camp", x: 1780, y: 1400, radius: 42, scale: 1 },
    { type: "campfire", x: 1830, y: 1320, radius: 20, scale: 1 },
    { type: "chest", x: 1940, y: 710, radius: 22, scale: 1 },
    { type: "totem", x: 2240, y: 1240, radius: 26, scale: 1 },
    { type: "ruin", x: 2640, y: 520, radius: 58, scale: 1.2 },
    { type: "chest", x: 2520, y: 780, radius: 22, scale: 1 },
    { type: "objective", x: 2780, y: 460, radius: 26, scale: 1 },
  );

  for (let i = 0; i < (stress ? 520 : 290); i++) {
    grass.push({
      x: range(50, WORLD.width - 50),
      y: range(50, WORLD.height - 50),
      size: range(4, 10),
    });
  }

  const initial: readonly [number, number, keyof typeof ENEMY_DEFINITIONS][] = [
    [760, 680, "grunt"],
    [980, 510, "fast"],
    [1320, 860, "grunt"],
    [1550, 1120, "heavy"],
    [1760, 680, "fast"],
    [2210, 910, "heavy"],
    [2420, 620, "fast"],
    [2670, 930, "heavy"],
  ];

  initial.forEach(([x, y, kind], index) => {
    enemies.push(createEnemy(index, kind, x, y, rand));
  });

  return {
    props,
    decorative,
    grass,
    enemies,
    grid: new CollisionGrid(props, decorative),
  };
}
