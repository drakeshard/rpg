import type {
  Afterimage,
  Decor,
  Enemy,
  Grass,
  Loot,
  Particle,
  Player,
  Prop,
  VisualState,
} from "./model";
import { warriorFrame, wizardFrame, type SpriteFrame, type SpriteMotion } from "./sprite-art";
import { WORLD } from "./world";

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface RendererOptions {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  radar: HTMLCanvasElement;
  rctx: CanvasRenderingContext2D;
  camera: Camera;
  player: Player;
  props: Prop[];
  decorative: Decor[];
  grass: Grass[];
  enemies: Enemy[];
  loot: Loot[];
  particles: Particle[];
  afterimages: Afterimage[];
  damageNumbers: { x: number; y: number; value: string; life: number; color: string }[];
  visual: VisualState;
  demoSprites: boolean;
}

const ISO_X = 0.72;
const ISO_Y = 0.36;

export function createRenderer(options: RendererOptions) {
  const {
    canvas,
    ctx,
    radar,
    rctx,
    camera,
    player,
    props,
    decorative,
    grass,
    enemies,
    loot,
    particles,
    afterimages,
    damageNumbers,
    visual,
    demoSprites,
  } = options;

  let visibleEntities = 0;

  function project(x: number, y: number, z = 0) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dx = x - camera.x;
    const dy = y - camera.y;
    return {
      x: width / 2 + (dx - dy) * ISO_X * camera.zoom,
      y: height / 2 + (dx + dy) * ISO_Y * camera.zoom - z * camera.zoom,
    };
  }

  function visible(x: number, y: number, margin = 100) {
    const p = project(x, y);
    return p.x > -margin && p.x < canvas.clientWidth + margin && p.y > -margin && p.y < canvas.clientHeight + margin;
  }

  function shadow(x: number, y: number, rx: number, ry: number, alpha = 0.22) {
    const p = project(x, y);
    ctx.fillStyle = `rgba(3, 12, 10, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * camera.zoom, ry * camera.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGround() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#1c3029");
    sky.addColorStop(0.48, "#172b24");
    sky.addColorStop(1, "#0f211c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const haze = ctx.createRadialGradient(width * 0.53, height * 0.36, 0, width * 0.53, height * 0.36, width * 0.72);
    haze.addColorStop(0, "rgba(164, 185, 145, .075)");
    haze.addColorStop(0.52, "rgba(82, 121, 96, .025)");
    haze.addColorStop(1, "rgba(0, 0, 0, .16)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(188, 205, 173, .025)";
    ctx.lineWidth = 1;
    const spacing = 120;
    for (let x = -200; x < 2100; x += spacing) {
      const a = project(x, 0);
      const b = project(x, 1500);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let y = -200; y < 1700; y += spacing) {
      const a = project(0, y);
      const b = project(1900, y);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    const roadA = project(240, 900);
    const roadB = project(1720, 720);
    ctx.strokeStyle = "rgba(164, 145, 106, .07)";
    ctx.lineWidth = 58 * camera.zoom;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(roadA.x, roadA.y);
    ctx.lineTo(roadB.x, roadB.y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(211, 190, 137, .045)";
    ctx.lineWidth = 2 * camera.zoom;
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  function drawGrass(item: Grass) {
    if (!visible(item.x, item.y, 25)) return;
    const p = project(item.x, item.y);
    ctx.strokeStyle = "rgba(126, 155, 102, .45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - item.size * 0.45, p.y - item.size);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + item.size * 0.35, p.y - item.size * 0.8);
    ctx.stroke();
  }

  function drawProp(item: Prop) {
    if (!visible(item.x, item.y, 100)) return;
    visibleEntities++;
    const p = project(item.x, item.y);
    const s = item.scale * camera.zoom;
    shadow(item.x, item.y, item.radius * item.scale * 1.08, item.radius * item.scale * 0.34, .24);

    if (item.type === "tree") {
      ctx.fillStyle = "#493a2d";
      ctx.beginPath();
      ctx.roundRect(p.x - 5 * s, p.y - 43 * s, 10 * s, 43 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = "#2e523b";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 59 * s, 24 * s, 0, Math.PI * 2);
      ctx.arc(p.x - 17 * s, p.y - 52 * s, 17 * s, 0, Math.PI * 2);
      ctx.arc(p.x + 16 * s, p.y - 51 * s, 18 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(116, 151, 91, .5)";
      ctx.beginPath();
      ctx.arc(p.x - 7 * s, p.y - 69 * s, 11 * s, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (item.type === "bush") {
      ctx.fillStyle = "#315b40";
      ctx.beginPath();
      ctx.arc(p.x - 9 * s, p.y - 10 * s, 13 * s, 0, Math.PI * 2);
      ctx.arc(p.x + 7 * s, p.y - 12 * s, 15 * s, 0, Math.PI * 2);
      ctx.arc(p.x, p.y - 21 * s, 12 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(146, 178, 108, .22)";
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    if (item.type === "rock") {
      ctx.fillStyle = "#657069";
      ctx.beginPath();
      ctx.moveTo(p.x - 18 * s, p.y - 3 * s);
      ctx.lineTo(p.x - 12 * s, p.y - 23 * s);
      ctx.lineTo(p.x + 4 * s, p.y - 31 * s);
      ctx.lineTo(p.x + 19 * s, p.y - 13 * s);
      ctx.lineTo(p.x + 14 * s, p.y - 2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(200, 211, 194, .16)";
      ctx.stroke();
      return;
    }

    const wood = item.type === "crate" || item.type === "barrel" || item.type === "log";
    ctx.fillStyle = wood ? "#745238" : "#626b66";
    ctx.beginPath();
    ctx.roundRect(p.x - 17 * s, p.y - 26 * s, 34 * s, 25 * s, 4 * s);
    ctx.fill();
    ctx.strokeStyle = wood ? "rgba(218, 177, 112, .2)" : "rgba(205, 217, 207, .14)";
    ctx.stroke();
    if (item.type === "crate") {
      ctx.beginPath();
      ctx.moveTo(p.x - 13 * s, p.y - 22 * s);
      ctx.lineTo(p.x + 13 * s, p.y - 5 * s);
      ctx.moveTo(p.x + 13 * s, p.y - 22 * s);
      ctx.lineTo(p.x - 13 * s, p.y - 5 * s);
      ctx.stroke();
    }
  }

  function drawDecor(item: Decor) {
    if (!visible(item.x, item.y, 140)) return;
    visibleEntities++;
    const p = project(item.x, item.y);
    const s = item.scale * camera.zoom;
    shadow(item.x, item.y, item.radius * item.scale, item.radius * item.scale * 0.32);

    if (item.type === "objective") {
      const ready = player.kills >= 8;
      const pulse = 1 + Math.sin(visual.time * 4.2) * .07;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = ready ? "rgba(140, 238, 207, .6)" : "rgba(126, 151, 142, .34)";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = ready ? "rgba(106, 214, 181, .11)" : "rgba(96, 120, 111, .08)";
      ctx.fill();
      ctx.fillStyle = ready ? "#8ee3ca" : "#6c8c82";
      ctx.beginPath();
      ctx.moveTo(0, -78 * s);
      ctx.lineTo(16 * s, -46 * s);
      ctx.lineTo(8 * s, -22 * s);
      ctx.lineTo(0, -11 * s);
      ctx.lineTo(-8 * s, -22 * s);
      ctx.lineTo(-16 * s, -46 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ready ? "#d4fff2" : "#93aaa3";
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
      if (ready) {
        const glow = ctx.createRadialGradient(0, -43 * s, 2, 0, -43 * s, 48 * s);
        glow.addColorStop(0, "rgba(121, 236, 201, .26)");
        glow.addColorStop(1, "rgba(121, 236, 201, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(-55 * s, -95 * s, 110 * s, 110 * s);
      }
      ctx.restore();
      return;
    }

    if (item.type === "campfire") {
      ctx.fillStyle = "#705a43";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 23 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#493b30";
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(p.x - 14 * s, p.y + 2 * s);
      ctx.lineTo(p.x + 13 * s, p.y - 4 * s);
      ctx.moveTo(p.x - 13 * s, p.y - 4 * s);
      ctx.lineTo(p.x + 14 * s, p.y + 2 * s);
      ctx.stroke();
      const flicker = Math.sin(visual.time * 11) * 4;
      const fire = ctx.createLinearGradient(0, p.y - 42 * s, 0, p.y);
      fire.addColorStop(0, "#f9d67a");
      fire.addColorStop(.55, "#e98743");
      fire.addColorStop(1, "#b64432");
      ctx.fillStyle = fire;
      ctx.beginPath();
      ctx.moveTo(p.x - 11 * s, p.y - 4 * s);
      ctx.quadraticCurveTo(p.x - 4 * s, p.y - 24 * s, p.x + flicker * s, p.y - 41 * s);
      ctx.quadraticCurveTo(p.x + 15 * s, p.y - 18 * s, p.x + 11 * s, p.y - 4 * s);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (item.type === "chest") {
      const opened = Boolean(item.opened);
      ctx.fillStyle = opened ? "#584532" : "#82583a";
      ctx.beginPath();
      ctx.roundRect(p.x - 23 * s, p.y - 25 * s, 46 * s, 23 * s, 4 * s);
      ctx.fill();
      ctx.strokeStyle = "rgba(222, 187, 112, .36)";
      ctx.lineWidth = 1.5 * s;
      ctx.stroke();
      ctx.fillStyle = "#c6a05a";
      ctx.fillRect(p.x - 3 * s, p.y - 25 * s, 6 * s, 20 * s);
      if (!opened) {
        ctx.strokeStyle = "rgba(231, 202, 127, .26)";
        ctx.beginPath();
        ctx.arc(p.x, p.y - 16 * s, 29 * s + Math.sin(visual.time * 3) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    if (item.type === "ruin") {
      ctx.fillStyle = "#58645e";
      ctx.beginPath();
      ctx.moveTo(p.x - 25 * s, p.y - 2 * s);
      ctx.lineTo(p.x - 22 * s, p.y - 52 * s);
      ctx.lineTo(p.x - 4 * s, p.y - 61 * s);
      ctx.lineTo(p.x + 22 * s, p.y - 46 * s);
      ctx.lineTo(p.x + 25 * s, p.y - 2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#182720";
      ctx.beginPath();
      ctx.roundRect(p.x - 8 * s, p.y - 36 * s, 16 * s, 34 * s, 8 * s);
      ctx.fill();
      ctx.strokeStyle = "rgba(190, 208, 191, .13)";
      ctx.stroke();
      return;
    }

    ctx.fillStyle = "#65513c";
    ctx.beginPath();
    ctx.roundRect(p.x - 22 * s, p.y - 44 * s, 44 * s, 42 * s, 5 * s);
    ctx.fill();
  }

  function drawSpriteFrame(
    frame: SpriteFrame,
    centerX: number,
    feetY: number,
    scale: number,
    alpha = 1,
  ) {
    const width = 96 * scale;
    const height = 120 * scale;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      frame.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      centerX - width / 2,
      feetY - height,
      width,
      height,
    );
    ctx.restore();
  }
  function drawSlashTrail(
    centerX: number,
    centerY: number,
    facingX: number,
    facingY: number,
    phase: number,
    scale: number,
  ) {
    const clamped = Math.min(1, Math.max(0, phase));
    const contact = Math.sin(clamped * Math.PI);
    if (contact <= .04) return;

    const screenX = facingX - facingY;
    const screenY = (facingX + facingY) * .5;
    const baseAngle = Math.atan2(screenY, screenX);
    const sweepDirection = screenX >= 0 ? 1 : -1;
    const bladeAngle = baseAngle + sweepDirection * (-1.05 + clamped * 1.95);
    const trailSpan = .78;
    const outer = 50 * scale;
    const inner = 27 * scale;
    const tailAngle = bladeAngle - sweepDirection * trailSpan;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = .2 + contact * .48;
    const glow = ctx.createRadialGradient(centerX, centerY, inner * .65, centerX, centerY, outer);
    glow.addColorStop(0, "rgba(255, 229, 159, 0)");
    glow.addColorStop(.56, "rgba(255, 218, 126, .18)");
    glow.addColorStop(1, "rgba(255, 245, 205, .86)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outer, tailAngle, bladeAngle, sweepDirection < 0);
    ctx.arc(centerX, centerY, inner, bladeAngle, tailAngle, sweepDirection >= 0);
    ctx.closePath();
    ctx.fill();

    const tipX = centerX + Math.cos(bladeAngle) * outer;
    const tipY = centerY + Math.sin(bladeAngle) * outer;
    const baseX = centerX + Math.cos(bladeAngle) * inner;
    const baseY = centerY + Math.sin(bladeAngle) * inner;
    ctx.globalAlpha = .35 + contact * .65;
    ctx.strokeStyle = "#fff1bd";
    ctx.lineWidth = (1.3 + contact * 1.5) * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.restore();
  }
  function limb(x1: number, y1: number, x2: number, y2: number, width: number, color: string) {
    ctx.strokeStyle = "rgba(7, 12, 10, .62)";
    ctx.lineWidth = width + 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  function boot(x: number, y: number, scale: number, color: string, direction = 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + direction * 2 * scale, y, 6 * scale, 3.4 * scale, direction * .08, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShield(x: number, y: number, scale: number, color: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -12 * scale);
    ctx.lineTo(10 * scale, -6 * scale);
    ctx.lineTo(8 * scale, 9 * scale);
    ctx.lineTo(0, 15 * scale);
    ctx.lineTo(-8 * scale, 9 * scale);
    ctx.lineTo(-10 * scale, -6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(226, 210, 161, .38)";
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
    ctx.fillStyle = "rgba(224, 196, 114, .32)";
    ctx.beginPath();
    ctx.arc(0, 0, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSword(x: number, y: number, angle: number, scale: number, glow = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = "#5b4633";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -10 * scale);
    ctx.stroke();
    ctx.strokeStyle = glow ? "#ffe7a8" : "#d9cfaa";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(0, -8 * scale);
    ctx.lineTo(0, -35 * scale);
    ctx.stroke();
    ctx.strokeStyle = "#aa8b4d";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-6 * scale, -9 * scale);
    ctx.lineTo(6 * scale, -9 * scale);
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemy(enemy: Enemy) {
    if (enemy.dead && enemy.deathTimer <= 0) return;
    if (!visible(enemy.x, enemy.y, 120)) return;
    visibleEntities++;

    const p = project(enemy.x, enemy.y, enemy.z);
    const s = camera.zoom;
    const heavy = enemy.definition.id === "heavy";
    const fast = enemy.definition.id === "fast";
    const alpha = enemy.dead ? Math.max(.12, enemy.deathTimer / .65) : 1;
    const spriteMotion: SpriteMotion =
      enemy.state === "ATTACK" ? "attack" :
      enemy.state === "CHASE" || enemy.state === "RETURN" || enemy.state === "WANDER" ? "walk" : "idle";
    const sprite = (fast ? wizardFrame : warriorFrame)(
      spriteMotion,
      enemy.facingX,
      enemy.facingY,
      visual.time + enemy.id * .17,
    );
    if (sprite) {
      const artScale = s * (heavy ? 1.08 : fast ? .88 : .96);
      shadow(enemy.x, enemy.y, heavy ? 31 : fast ? 20 : 24, heavy ? 11 : 8, .3 * alpha);
      if (enemy.hitFlash > 0) {
        ctx.fillStyle = "rgba(255, 225, 190, .16)";
        ctx.beginPath();
        ctx.arc(p.x, p.y - 46 * artScale, 31 * artScale, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSpriteFrame(sprite, p.x, p.y + 5 * s, artScale, alpha);
      if (!enemy.dead && (enemy.hp < enemy.maxHp || enemy.barTimer > 0)) {
        const w = (heavy ? 54 : fast ? 42 : 46) * s;
        const y = p.y - (heavy ? 112 : 101) * s;
        ctx.fillStyle = "rgba(6, 12, 10, .82)";
        ctx.fillRect(p.x - w / 2, y, w, 5);
        ctx.fillStyle = heavy ? "#bd6c55" : fast ? "#d37a78" : "#c56d5d";
        ctx.fillRect(p.x - w / 2 + 1, y + 1, Math.max(0, (w - 2) * (enemy.hp / enemy.maxHp)), 3);
      }
      return;
    }
    const gait = enemy.dead ? 0 : Math.sin(enemy.stepTime * (fast ? 3.8 : heavy ? 2.1 : 2.9));
    const attackPhase = enemy.attackAnim > 0 ? Math.sin(Math.min(1, enemy.attackAnim / .3) * Math.PI) : 0;
    const fx = enemy.facingX - enemy.facingY;
    const fy = (enemy.facingX + enemy.facingY) * .5;
    const side = fx >= 0 ? 1 : -1;
    const lean = enemy.state === "ATTACK" ? 4 * s : enemy.state === "CHASE" ? 2 * s : 0;

    const hipY = -24 * s;
    const shoulderY = -49 * s;
    const headY = -65 * s;
    const legSpread = (heavy ? 9 : fast ? 6 : 8) * s;
    const step = gait * (fast ? 6 : heavy ? 3.2 : 4.6) * s;

    shadow(enemy.x, enemy.y, heavy ? 31 : fast ? 20 : 24, heavy ? 11 : 8, .31 * alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x + fx * lean, p.y + fy * lean);

    const legColor = heavy ? "#372b29" : fast ? "#2c272d" : "#352c28";
    limb(-legSpread, hipY, -legSpread - step * .45, -4 * s, (heavy ? 8 : 6) * s, legColor);
    limb(legSpread, hipY, legSpread + step * .45, -4 * s, (heavy ? 8 : 6) * s, legColor);
    boot(-legSpread - step * .45, -2 * s, s, "#211c1b", side);
    boot(legSpread + step * .45, -2 * s, s, "#211c1b", side);

    const cloakColor = heavy ? "#4b302d" : fast ? "#3f2933" : "#46302c";
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.moveTo(-16 * s, shoulderY + 6 * s);
    ctx.lineTo(16 * s, shoulderY + 6 * s);
    ctx.lineTo((heavy ? 18 : 14) * s, -8 * s);
    ctx.lineTo(0, -2 * s);
    ctx.lineTo(-(heavy ? 18 : 14) * s, -8 * s);
    ctx.closePath();
    ctx.fill();

    const armor = enemy.hitFlash > 0 ? "#e9b99d" : heavy ? "#73513f" : fast ? "#774554" : enemy.definition.color;
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.roundRect(-(heavy ? 17 : fast ? 12.5 : 14.5) * s, shoulderY - 1 * s, (heavy ? 34 : fast ? 25 : 29) * s, (heavy ? 34 : 29) * s, 6 * s);
    ctx.fill();
    ctx.strokeStyle = "rgba(235, 224, 186, .13)";
    ctx.stroke();

    const shoulderOffset = (heavy ? 20 : 16) * s;
    const armSwing = gait * (fast ? 7 : 4) * s;
    const attackReach = attackPhase * (heavy ? 18 : 14) * s;
    const weaponShoulderX = side * shoulderOffset;
    const offShoulderX = -side * shoulderOffset;
    limb(weaponShoulderX, shoulderY + 4 * s, weaponShoulderX + side * (9 * s + attackReach), -30 * s + armSwing * .35, (heavy ? 8 : 6) * s, armor);
    limb(offShoulderX, shoulderY + 5 * s, offShoulderX - side * 7 * s, -30 * s - armSwing * .35, (heavy ? 8 : 6) * s, armor);

    const headColor = enemy.hitFlash > 0 ? "#f4c7aa" : "#aa7860";
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(0, headY, (heavy ? 11 : 9) * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = heavy ? "#3a2a26" : fast ? "#311f2a" : "#352621";
    ctx.beginPath();
    if (heavy) {
      ctx.moveTo(-12 * s, headY - 3 * s);
      ctx.lineTo(0, headY - 16 * s);
      ctx.lineTo(12 * s, headY - 3 * s);
      ctx.lineTo(8 * s, headY + 6 * s);
      ctx.lineTo(-8 * s, headY + 6 * s);
    } else if (fast) {
      ctx.moveTo(-10 * s, headY - 4 * s);
      ctx.lineTo(-2 * s, headY - 14 * s);
      ctx.lineTo(10 * s, headY - 7 * s);
      ctx.lineTo(7 * s, headY + 6 * s);
      ctx.lineTo(-8 * s, headY + 4 * s);
    } else {
      ctx.moveTo(-10 * s, headY - 4 * s);
      ctx.lineTo(0, headY - 13 * s);
      ctx.lineTo(10 * s, headY - 4 * s);
      ctx.lineTo(8 * s, headY + 6 * s);
      ctx.lineTo(-8 * s, headY + 6 * s);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = enemy.state === "ALERT" || enemy.state === "CHASE" || enemy.state === "ATTACK" ? "#ffbb7e" : "#bf7d62";
    ctx.fillRect(-5 * s, headY - 1 * s, 3 * s, 2 * s);
    ctx.fillRect(2 * s, headY - 1 * s, 3 * s, 2 * s);

    if (heavy) {
      drawShield(offShoulderX - side * 8 * s, -29 * s, s * 1.05, "#614b39");
      ctx.save();
      ctx.translate(weaponShoulderX + side * (12 * s + attackReach), -30 * s);
      ctx.rotate(side * (.72 - attackPhase * 1.1));
      ctx.strokeStyle = "#9a7c54";
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -30 * s);
      ctx.stroke();
      ctx.fillStyle = "#6e5b49";
      ctx.beginPath();
      ctx.arc(0, -34 * s, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (fast) {
      drawSword(weaponShoulderX + side * (10 * s + attackReach), -31 * s, side * (.48 - attackPhase * .95), s * .8, enemy.state === "ATTACK");
      ctx.fillStyle = "rgba(119, 58, 72, .82)";
      ctx.beginPath();
      ctx.moveTo(-side * 4 * s, shoulderY + 7 * s);
      ctx.lineTo(-side * 24 * s, -29 * s + gait * 3 * s);
      ctx.lineTo(-side * 11 * s, -20 * s);
      ctx.closePath();
      ctx.fill();
    } else {
      drawSword(weaponShoulderX + side * (9 * s + attackReach), -31 * s, side * (.58 - attackPhase * .85), s * .9, enemy.state === "ATTACK");
    }

    ctx.restore();

    if (!enemy.dead && (enemy.hp < enemy.maxHp || enemy.barTimer > 0)) {
      const w = (heavy ? 54 : fast ? 42 : 46) * s;
      const y = p.y - (heavy ? 88 : 80) * s;
      ctx.fillStyle = "rgba(6, 12, 10, .82)";
      ctx.fillRect(p.x - w / 2, y, w, 5);
      ctx.fillStyle = heavy ? "#bd6c55" : fast ? "#d37a78" : "#c56d5d";
      ctx.fillRect(p.x - w / 2 + 1, y + 1, Math.max(0, (w - 2) * (enemy.hp / enemy.maxHp)), 3);
    }
  }
  function drawPlayer() {
    const p = project(player.x, player.y, player.z);
    const s = camera.zoom;
    const moving = player.state === "walk" || player.state === "run";
    const gait = moving ? Math.sin(player.stepTime * (player.state === "run" ? 3.7 : 2.8)) : 0;
    const bob = moving ? Math.abs(Math.cos(player.stepTime * 2.8)) * (player.state === "run" ? 2.2 : 1.2) * s : 0;
    const fx = player.visualFacingX - player.visualFacingY;
    const fy = (player.visualFacingX + player.visualFacingY) * .5;
    const side = fx >= 0 ? 1 : -1;
    const fallbackAttackPhase = player.attackTimer > 0
      ? Math.sin((1 - player.attackTimer / .34) * Math.PI)
      : 0;
    const hit = player.hitFlash > 0;
    const spriteMotion: SpriteMotion =
      player.state === "attack" ? "attack" :
      player.state === "walk" || player.state === "run" || player.state === "dash" ? "walk" : "idle";
    const attackPhase = player.attackTimer > 0 ? 1 - player.attackTimer / .34 : 0;
    const sprite = warriorFrame(
      spriteMotion,
      player.visualFacingX,
      player.visualFacingY,
      visual.time,
      spriteMotion === "attack" ? attackPhase : undefined,
    );
    if (sprite) {
      for (const image of afterimages) {
        const q = project(image.x, image.y);
        drawSpriteFrame(sprite, q.x, q.y + 5 * s, s, Math.max(0, image.life / .22) * .13);
      }
      shadow(player.x, player.y, 27, 10, .35);
      if (hit) {
        ctx.fillStyle = "rgba(182, 248, 232, .15)";
        ctx.beginPath();
        ctx.arc(p.x, p.y - 50 * s, 33 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSpriteFrame(sprite, p.x, p.y + 5 * s, s, 1);
      if (spriteMotion === "attack") {
        drawSlashTrail(
          p.x,
          p.y - 46 * s,
          player.visualFacingX,
          player.visualFacingY,
          attackPhase,
          s,
        );
      }
      return;
    }

    for (const image of afterimages) {
      const q = project(image.x, image.y);
      ctx.globalAlpha = Math.max(0, image.life / .22) * .2;
      ctx.fillStyle = "#75bbaa";
      ctx.beginPath();
      ctx.moveTo(q.x - 13 * s, q.y - 49 * s);
      ctx.lineTo(q.x + 13 * s, q.y - 49 * s);
      ctx.lineTo(q.x + 16 * s, q.y - 6 * s);
      ctx.lineTo(q.x, q.y);
      ctx.lineTo(q.x - 16 * s, q.y - 6 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    shadow(player.x, player.y, 27, 10, .35);
    ctx.save();
    const dashLean = player.state === "dash" ? 7 * s : 0;
    ctx.translate(p.x + fx * dashLean, p.y + bob + fy * dashLean);

    const hipY = -25 * s;
    const shoulderY = -50 * s;
    const headY = -67 * s;
    const step = gait * (player.state === "run" ? 6.5 : 4.3) * s;

    limb(-7 * s, hipY, -8 * s - step * .42, -5 * s, 6.5 * s, "#263d3f");
    limb(7 * s, hipY, 8 * s + step * .42, -5 * s, 6.5 * s, "#263d3f");
    boot(-8 * s - step * .42, -2 * s, s, "#171f20", side);
    boot(8 * s + step * .42, -2 * s, s, "#171f20", side);

    ctx.fillStyle = player.state === "dash" ? "rgba(82, 151, 140, .38)" : "#1a3134";
    ctx.beginPath();
    ctx.moveTo(-16 * s, shoulderY + 4 * s);
    ctx.lineTo(16 * s, shoulderY + 4 * s);
    ctx.lineTo(18 * s, -10 * s);
    ctx.lineTo(0, -2 * s);
    ctx.lineTo(-18 * s, -10 * s);
    ctx.closePath();
    ctx.fill();

    const chest = ctx.createLinearGradient(0, shoulderY, 0, -15 * s);
    chest.addColorStop(0, hit ? "#99d2c6" : "#42777a");
    chest.addColorStop(1, hit ? "#6eaaa1" : "#274e53");
    ctx.fillStyle = chest;
    ctx.beginPath();
    ctx.roundRect(-15 * s, shoulderY - 1 * s, 30 * s, 32 * s, 7 * s);
    ctx.fill();
    ctx.strokeStyle = "rgba(235, 224, 186, .16)";
    ctx.stroke();

    ctx.fillStyle = "#2d5559";
    ctx.beginPath();
    ctx.moveTo(-15 * s, shoulderY + 4 * s);
    ctx.lineTo(0, shoulderY - 2 * s);
    ctx.lineTo(15 * s, shoulderY + 4 * s);
    ctx.lineTo(12 * s, shoulderY + 11 * s);
    ctx.lineTo(-12 * s, shoulderY + 11 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ba9662";
    ctx.fillRect(-15 * s, -28 * s, 30 * s, 4 * s);
    ctx.fillStyle = "#d1b16b";
    ctx.fillRect(-2 * s, -29 * s, 4 * s, 6 * s);

    const shoulderOffset = 17 * s;
    const armSwing = gait * 5 * s;
    const swordArmX = side * shoulderOffset;
    const shieldArmX = -side * shoulderOffset;
    const swordReach = 10 * s + fallbackAttackPhase * 22 * s;
    limb(swordArmX, shoulderY + 5 * s, swordArmX + side * swordReach, -31 * s + armSwing * .25, 6 * s, hit ? "#8dc5ba" : "#376b6d");
    limb(shieldArmX, shoulderY + 5 * s, shieldArmX - side * 7 * s, -31 * s - armSwing * .25, 6 * s, hit ? "#8dc5ba" : "#376b6d");

    ctx.fillStyle = hit ? "#eef8ec" : "#d5c39c";
    ctx.beginPath();
    ctx.arc(0, headY, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#172d2e";
    ctx.beginPath();
    ctx.moveTo(-11 * s, headY - 3 * s);
    ctx.lineTo(-5 * s, headY - 14 * s);
    ctx.lineTo(5 * s, headY - 16 * s);
    ctx.lineTo(12 * s, headY - 4 * s);
    ctx.lineTo(8 * s, headY + 4 * s);
    ctx.lineTo(-8 * s, headY + 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#a9d9cc";
    ctx.fillRect((-4 + fx * 1.8) * s, (headY - 1 + fy * 1.8) * s, 3 * s, 2 * s);

    drawShield(shieldArmX - side * 8 * s, -30 * s, s * .95, "#31585b");
    drawSword(swordArmX + side * swordReach, -31 * s + armSwing * .25, side * (.62 - fallbackAttackPhase * 1.25), s, attackPhase > .2);

    if (fallbackAttackPhase > .05) {
      drawSlashTrail(
        0,
        -34 * s,
        player.visualFacingX,
        player.visualFacingY,
        1 - player.attackTimer / .34,
        s,
      );
    }

    if (player.state === "dash") {
      ctx.strokeStyle = "rgba(133, 226, 201, .44)";
      ctx.lineWidth = 2 * s;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-fx * (14 + i * 7) * s, (-18 - i * 8) * s);
        ctx.lineTo(-fx * (35 + i * 9) * s, (-18 - i * 8 + fy * 7) * s);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
  function drawLoot(item: Loot) {
    if (item.picked || !visible(item.x, item.y, 50)) return;
    visibleEntities++;
    const lift = 9 + Math.sin(visual.time * 4 + item.x) * 3;
    const p = project(item.x, item.y, lift);
    const scale = camera.zoom;
    const gold = item.type === "gold";
    const equipment = item.type === "equipment";
    ctx.save();
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 18 * scale);
    glow.addColorStop(
      0,
      gold
        ? "rgba(242, 205, 102, .34)"
        : equipment
          ? "rgba(160, 132, 255, .38)"
          : "rgba(105, 220, 145, .3)",
    );
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
    if (gold) {
      ctx.fillStyle = "#eccb69";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 8 * scale, 5 * scale, -.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff0aa";
      ctx.stroke();
    } else if (equipment) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#9d83ed";
      ctx.fillRect(-7 * scale, -7 * scale, 14 * scale, 14 * scale);
      ctx.strokeStyle = "#eadbff";
      ctx.lineWidth = 1.5 * scale;
      ctx.strokeRect(-7 * scale, -7 * scale, 14 * scale, 14 * scale);
      ctx.restore();
    } else {
      ctx.fillStyle = "#75d49a";
      ctx.beginPath();
      ctx.roundRect(p.x - 5 * scale, p.y - 8 * scale, 10 * scale, 14 * scale, 3 * scale);
      ctx.fill();
      ctx.fillStyle = "#d2bc7b";
      ctx.fillRect(p.x - 3 * scale, p.y - 11 * scale, 6 * scale, 4 * scale);
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const item of particles) {
      const p = project(item.x, item.y, item.z);
      ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
      ctx.fillStyle = item.color;
      ctx.fillRect(p.x, p.y, item.size * camera.zoom, item.size * camera.zoom);
    }
    ctx.globalAlpha = 1;
    for (const number of damageNumbers) {
      const p = project(number.x, number.y, 60 + (0.75 - number.life) * 30);
      ctx.globalAlpha = Math.max(0, number.life / 0.75);
      ctx.fillStyle = number.color;
      ctx.font = "700 14px ui-sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(number.value, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawRadar() {
    const width = radar.width;
    const height = radar.height;
    rctx.clearRect(0, 0, width, height);
    const background = rctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, width / 2);
    background.addColorStop(0, "#18352c");
    background.addColorStop(1, "#0a1d18");
    rctx.fillStyle = background;
    rctx.beginPath();
    rctx.arc(width / 2, height / 2, width / 2 - 2, 0, Math.PI * 2);
    rctx.fill();
    rctx.save();
    rctx.beginPath();
    rctx.arc(width / 2, height / 2, width / 2 - 4, 0, Math.PI * 2);
    rctx.clip();

    rctx.strokeStyle = "rgba(186, 207, 177, .09)";
    rctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      rctx.beginPath();
      rctx.arc(width / 2, height / 2, i * width / 8, 0, Math.PI * 2);
      rctx.stroke();
    }

    const map = (x: number, y: number) => ({
      x: x / WORLD.width * width,
      y: y / WORLD.height * height,
    });
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const q = map(enemy.x, enemy.y);
      rctx.fillStyle = enemy.definition.id === "heavy" ? "#e0a060" : "#d76d5f";
      rctx.beginPath();
      rctx.arc(q.x, q.y, enemy.definition.id === "heavy" ? 3.2 : 2.3, 0, Math.PI * 2);
      rctx.fill();
    }

    const objective = decorative.find((item) => item.type === "objective");
    if (objective) {
      const q = map(objective.x, objective.y);
      rctx.strokeStyle = player.kills >= 8 ? "#8de0c8" : "#d2b76f";
      rctx.lineWidth = 1.5;
      rctx.beginPath();
      rctx.arc(q.x, q.y, 5.5 + Math.sin(visual.time * 4) * 1.2, 0, Math.PI * 2);
      rctx.stroke();
    }

    const q = map(player.x, player.y);
    rctx.save();
    rctx.translate(q.x, q.y);
    const angle = Math.atan2(player.facingY, player.facingX) + Math.PI / 4;
    rctx.rotate(angle);
    rctx.fillStyle = "#b9f3e4";
    rctx.beginPath();
    rctx.moveTo(6, 0);
    rctx.lineTo(-4, -4);
    rctx.lineTo(-2, 0);
    rctx.lineTo(-4, 4);
    rctx.closePath();
    rctx.fill();
    rctx.restore();
    rctx.restore();
  }

  function render() {
    visibleEntities = 0;
    ctx.save();
    if (visual.shake > 0) {
      const amount = visual.shake;
      ctx.translate(Math.sin(visual.time * 53) * amount, Math.cos(visual.time * 47) * amount);
    }
    drawGround();
    for (const item of grass) drawGrass(item);
    const drawables: { y: number; draw: () => void }[] = [];
    for (const item of props) drawables.push({ y: item.x + item.y, draw: () => drawProp(item) });
    for (const item of decorative) drawables.push({ y: item.x + item.y, draw: () => drawDecor(item) });
    for (const item of loot) drawables.push({ y: item.x + item.y, draw: () => drawLoot(item) });
    for (const enemy of enemies) drawables.push({ y: enemy.x + enemy.y, draw: () => drawEnemy(enemy) });
    drawables.push({ y: player.x + player.y, draw: drawPlayer });
    drawables.sort((a, b) => a.y - b.y);
    for (const item of drawables) item.draw();
    drawParticles();
    ctx.restore();
    drawRadar();
  }

  return {
    render,
    project,
    get visibleEntities() {
      return visibleEntities;
    },
  };
}
