import type { Actor, Enemy, Player, Point } from './model';

export function updateEnemyAI(
  dt: number, enemies: Enemy[], player: Player,
  move: (actor: Actor, dx: number, dy: number) => void,
  attack: (damage: number, source: Point) => void,
  range: (min: number, max: number) => number,
  onWindup: () => void,
  onStrike: () => void
): { active: number; updates: number } {
  let active = 0, updates = 0;
  for (const enemy of enemies) {
    if (enemy.dead) { enemy.deathTimer = Math.max(0, enemy.deathTimer - dt); continue; }
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.attackAnim = Math.max(0, enemy.attackAnim - dt);
    enemy.alertTimer = Math.max(0, enemy.alertTimer - dt);
    enemy.barTimer = Math.max(0, enemy.barTimer - dt);
    enemy.stateTime = Math.max(0, enemy.stateTime - dt);
    enemy.aiTimer -= dt;
    if (enemy.aiTimer <= 0) {
      enemy.aiTimer += .12; updates++;
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      const home = Math.hypot(enemy.x - enemy.homeX, enemy.y - enemy.homeY);
      if (enemy.state === 'ALERT' && enemy.stateTime > 0) { /* readable reaction pause */ }
      else if (player.hp > 0 && distance < enemy.definition.detectionRange && home < 480 && enemy.state !== 'RETURN') {
        if (enemy.state === 'IDLE' || enemy.state === 'WANDER') {
          enemy.state = 'ALERT'; enemy.stateTime = .24; enemy.alertTimer = .7;
        } else enemy.state = distance <= enemy.definition.attackRange ? 'ATTACK' : 'CHASE';
      } else if ((enemy.state === 'CHASE' || enemy.state === 'ATTACK' || enemy.state === 'ALERT') && (distance > 520 || home >= 480 || player.hp <= 0)) {
        enemy.state = 'RETURN';
      } else if (enemy.state === 'RETURN' && home < 20) { enemy.state = 'IDLE'; enemy.stateTime = .8; }
      else if (enemy.state === 'IDLE' && enemy.stateTime <= 0) enemy.state = 'WANDER';
      else if (enemy.state === 'WANDER' && home > 145) enemy.state = 'RETURN';
    }
    let mx = 0, my = 0;
    if (enemy.state !== 'ATTACK' && enemy.attackWindup > 0) enemy.attackWindup = 0;
    if (enemy.state === 'CHASE' || enemy.state === 'ATTACK') {
      active++;
      const dx = player.x - enemy.x, dy = player.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.facingX = dx / length; enemy.facingY = dy / length;
      if (enemy.state === 'CHASE') { mx = enemy.facingX; my = enemy.facingY; }
      else if (enemy.attackWindup > 0) {
        enemy.attackWindup -= dt;
        if (enemy.attackWindup <= 0) {
          enemy.attackWindup = 0; enemy.attackAnim = .24;
          enemy.attackCooldown = range(.9, 1.25);
          onStrike();
          if (length <= enemy.definition.attackRange + 16) attack(enemy.definition.damage, enemy);
        }
      } else if (enemy.attackCooldown <= 0) {
        enemy.attackWindup = .28;
        onWindup();
      }
    } else if (enemy.state === 'RETURN') {
      const dx = enemy.homeX - enemy.x, dy = enemy.homeY - enemy.y, length = Math.hypot(dx, dy) || 1;
      mx = dx / length; my = dy / length; enemy.facingX = mx; enemy.facingY = my;
    } else if (enemy.state === 'WANDER') {
      enemy.wanderTimer -= dt;
      if (enemy.wanderTimer <= 0) { enemy.wanderAngle += range(-1.8, 1.8); enemy.wanderTimer = range(1.2, 3.2); }
      mx = Math.cos(enemy.wanderAngle) * .25; my = Math.sin(enemy.wanderAngle) * .25;
      enemy.facingX = mx; enemy.facingY = my;
    }
    if (mx || my) {
      const oldX = enemy.x, oldY = enemy.y;
      move(enemy, mx * enemy.definition.moveSpeed * dt, my * enemy.definition.moveSpeed * dt);
      enemy.stepTime += Math.hypot(enemy.x - oldX, enemy.y - oldY) * .07;
    }
  }
  return { active, updates };
}
