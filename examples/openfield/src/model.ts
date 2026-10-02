export interface Point { x: number; y: number }
export interface Actor extends Point { radius: number; hp: number; maxHp: number; hitFlash: number }
export type PlayerState = 'idle' | 'walk' | 'run' | 'attack' | 'dash' | 'hit' | 'dead';
export interface Player extends Actor {
  z: number; speed: number; stamina: number; maxStamina: number;
  facingX: number; facingY: number; attackCooldown: number; attackTimer: number;
  dashCooldown: number; dashTimer: number; invuln: number; kills: number;
  stepTime: number; state: PlayerState; gold: number; potions: number;
  vx: number; vy: number; visualFacingX: number; visualFacingY: number;
  moveAmount: number; dashX: number; dashY: number; deathTimer: number;
}
export type EnemyState = 'IDLE' | 'WANDER' | 'ALERT' | 'CHASE' | 'ATTACK' | 'RETURN' | 'DEAD';
export interface EnemyDefinition {
  id: string; maxHealth: number; moveSpeed: number; damage: number;
  attackRange: number; detectionRange: number; color: string;
}
export interface Enemy extends Actor {
  id: number; z: number; definition: EnemyDefinition; homeX: number; homeY: number;
  spawnArea?: string;
  state: EnemyState; stateTime: number; facingX: number; facingY: number;
  attackCooldown: number; dead: boolean; deathTimer: number;
  wanderAngle: number; wanderTimer: number; lastAttackSeen: number;
  aiTimer: number; alertTargetX: number; alertTargetY: number;
  stepTime: number; alertTimer: number; attackWindup: number;
  attackAnim: number; barTimer: number;
}
export type PropType = 'tree' | 'rock' | 'bush' | 'log' | 'crate' | 'barrel' | 'wall';
export interface Prop extends Point { type: PropType; radius: number; scale: number; hue: number }
export type DecorType = 'ruin' | 'camp' | 'totem' | 'campfire' | 'chest' | 'objective';
export interface Decor extends Point { type: DecorType; radius: number; scale: number; opened?: boolean; openTime?: number }
export interface Grass extends Point { size: number }
export interface Particle extends Point { z: number; vx: number; vy: number; vz: number; life: number; maxLife: number; color: string; size: number }
export interface Loot extends Point {
  type: 'gold' | 'potion' | 'equipment';
  amount: number;
  equipment?: string;
  picked: boolean;
  pickupTime: number;
  age: number;
}
export interface Afterimage extends Point { facingX: number; facingY: number; life: number }
export interface VisualState { time: number; shake: number; hitStop: number; objectivePulse: number; debug: boolean }
