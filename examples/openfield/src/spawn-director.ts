import type { Enemy, Player } from "./model";
import { areaAt, createEnemy, type AreaDefinition, WORLD } from "./world";

export const SPAWN_LIMITS = {
  maxEnemies: 26,
  targetBase: 12,
  targetPerRank: 1,
  maxLoot: 48,
  maxParticles: 280,
  maxDamageNumbers: 64,
  corpseGraceSeconds: 0.7,
  lootLifetimeSeconds: 45,
} as const;

export interface SpawnDirectorStats {
  area: AreaDefinition;
  targetAlive: number;
  alive: number;
  totalAllocated: number;
}

export class SpawnDirector {
  private cooldown = 0;
  private nextId = 1000;

  reset(): void {
    this.cooldown = 0;
    this.nextId = 1000;
  }

  update(
    dt: number,
    enemies: Enemy[],
    player: Player,
    rankIndex: number,
    random01: () => number,
    collides: (x: number, y: number, radius: number) => boolean,
  ): SpawnDirectorStats {
    for (let index = enemies.length - 1; index >= 0; index--) {
      const enemy = enemies[index];
      if (enemy.dead && enemy.deathTimer <= 0) enemies.splice(index, 1);
    }

    const area = areaAt(player.x, player.y);
    const targetAlive = Math.min(
      SPAWN_LIMITS.maxEnemies,
      SPAWN_LIMITS.targetBase + Math.max(0, rankIndex) * SPAWN_LIMITS.targetPerRank,
    );
    let alive = 0;
    for (const enemy of enemies) if (!enemy.dead) alive++;

    this.cooldown = Math.max(0, this.cooldown - dt);
    if (alive >= targetAlive || enemies.length >= SPAWN_LIMITS.maxEnemies || this.cooldown > 0) {
      return { area, targetAlive, alive, totalAllocated: enemies.length };
    }

    this.cooldown = 0.75 + random01() * 0.65;
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = random01() * Math.PI * 2;
      const distance = 440 + random01() * 260;
      const x = Math.max(80, Math.min(WORLD.width - 80, player.x + Math.cos(angle) * distance));
      const y = Math.max(80, Math.min(WORLD.height - 80, player.y + Math.sin(angle) * distance));
      if (areaAt(x, y).id !== area.id) continue;
      if (collides(x, y, 28)) continue;
      if (Math.hypot(x - player.x, y - player.y) < 380) continue;

      const kinds = area.mobs;
      const kind = kinds[Math.floor(random01() * kinds.length)] ?? "grunt";
      enemies.push(createEnemy(this.nextId++, kind, x, y, random01, area.id));
      alive++;
      break;
    }

    return { area, targetAlive, alive, totalAllocated: enemies.length };
  }
}
