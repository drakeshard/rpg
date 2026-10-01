import type { Actor, Point } from './model';

export function applyDamage(target: Actor, amount: number): number {
  const dealt = Math.min(target.hp, amount);
  target.hp = Math.max(0, target.hp - amount);
  target.hitFlash = .14;
  return dealt;
}

export function inAttackArc(attacker: Point & { facingX: number; facingY: number }, target: Point, range: number, minDot: number): boolean {
  const dx = target.x - attacker.x, dy = target.y - attacker.y;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared > range * range) return false;
  const inverseDistance = 1 / (Math.sqrt(distanceSquared) || 1);
  return (dx * attacker.facingX + dy * attacker.facingY) * inverseDistance > minDot;
}
