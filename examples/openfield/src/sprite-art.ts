export type SpriteMotion = "idle" | "walk" | "attack";

interface SpriteSet {
  idle: HTMLImageElement;
  walk: HTMLImageElement;
  attack: HTMLImageElement;
}

export interface SpriteFrame {
  image: HTMLImageElement;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const FRAME_WIDTH = 128;
const FRAME_HEIGHT = 160;
const FRAMES_PER_DIRECTION = 4;

function image(url: string): HTMLImageElement {
  const result = new Image();
  result.decoding = "async";
  result.src = url;
  return result;
}

const warrior: SpriteSet = {
  idle: image(
    "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_warrior_character_size_128x160_isometric_-_idle.png",
  ),
  walk: image(
    "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_warrior_character_size_128x160_isometric_-_walk.png",
  ),
  attack: image(
    "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_warrior_character_size_128x160_isometric_-_attack.png",
  ),
};

const wizard: SpriteSet = {
  idle: image(
    "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_wizard_character_size_128x160_isometric_-_idle.png",
  ),
  walk: image(
    "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_wizard_character_size_128x160_isometric_-_walk.png",
  ),
  attack: image(
    "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_wizard_character_size_128x160_isometric_-_attack.png",
  ),
};

function directionRow(worldX: number, worldY: number): number {
  const screenX = worldX - worldY;
  const screenY = worldX + worldY;

  // 2D!PIXX row order, expressed in projected screen directions:
  // 0 = down-left, 1 = down-right, 2 = up-left, 3 = up-right.
  if (screenY >= 0) return screenX >= 0 ? 1 : 0;
  return screenX < 0 ? 2 : 3;
}

function animationFrame(motion: SpriteMotion, time: number, phase?: number): number {
  if (motion === "attack" && phase !== undefined) {
    const clamped = Math.min(0.999, Math.max(0, phase));
    return Math.floor(clamped * FRAMES_PER_DIRECTION);
  }
  const fps = motion === "walk" ? 8 : motion === "attack" ? 10 : 3;
  return Math.floor(time * fps) % FRAMES_PER_DIRECTION;
}

function frameFrom(
  set: SpriteSet,
  motion: SpriteMotion,
  facingX: number,
  facingY: number,
  time: number,
  phase?: number,
): SpriteFrame | null {
  const source = set[motion];
  if (!source.complete || source.naturalWidth <= 0) return null;
  return {
    image: source,
    sx: animationFrame(motion, time, phase) * FRAME_WIDTH,
    sy: directionRow(facingX, facingY) * FRAME_HEIGHT,
    sw: FRAME_WIDTH,
    sh: FRAME_HEIGHT,
  };
}

export function warriorFrame(
  motion: SpriteMotion,
  facingX: number,
  facingY: number,
  time: number,
  phase?: number,
): SpriteFrame | null {
  return frameFrom(warrior, motion, facingX, facingY, time, phase);
}

export function wizardFrame(
  motion: SpriteMotion,
  facingX: number,
  facingY: number,
  time: number,
  phase?: number,
): SpriteFrame | null {
  return frameFrom(wizard, motion, facingX, facingY, time, phase);
}
