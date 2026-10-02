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
    if (!visible(enemy.x, enemy.y, 110)) return;
    visibleEntities++;
    const p = project(enemy.x, enemy.y, enemy.z);
    const alpha = enemy.dead ? Math.max(0.12, enemy.deathTimer / 0.65) : 1;
    const scale = camera.zoom;
    const heavy = enemy.definition.id === "heavy";
    const fast = enemy.definition.id === "fast";
    const bodyW = (heavy ? 22 : fast ? 14 : 17) * scale;
    const bodyH = (heavy ? 43 : fast ? 34 : 38) * scale;
    const bob = enemy.dead ? 0 : Math.sin(enemy.stepTime * 2.4) * (fast ? 2.2 : 1.2) * scale;
    shadow(enemy.x, enemy.y, heavy ? 29 : 22, heavy ? 10 : 8, 0.3 * alpha);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y + bob);

    const facingScreenX = (enemy.facingX - enemy.facingY) * scale;
    const facingScreenY = (enemy.facingX + enemy.facingY) * .5 * scale;

    ctx.fillStyle = "rgba(31, 22, 21, .86)";
    ctx.beginPath();
    ctx.moveTo(-bodyW, -bodyH * .72);
    ctx.lineTo(bodyW, -bodyH * .72);
    ctx.lineTo(bodyW * .76, -3 * scale);
    ctx.lineTo(-bodyW * .76, -3 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = enemy.hitFlash > 0 ? "#f1c2a6" : enemy.definition.color;
    ctx.beginPath();
    ctx.arc(0, -bodyH - 8 * scale, (heavy ? 11 : 9) * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = heavy ? "#4c342e" : fast ? "#3e3135" : "#47362f";
    ctx.beginPath();
    ctx.moveTo(-bodyW * .72, -bodyH * .95);
    ctx.lineTo(bodyW * .7, -bodyH * .95);
    ctx.lineTo(bodyW, -bodyH * .55);
    ctx.lineTo(bodyW * .7, -7 * scale);
    ctx.lineTo(-bodyW * .7, -7 * scale);
    ctx.lineTo(-bodyW, -bodyH * .55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = heavy ? "#6e5142" : "#5c463a";
    ctx.beginPath();
    ctx.moveTo(-9 * scale, -bodyH - 15 * scale);
    ctx.lineTo(0, -bodyH - 23 * scale);
    ctx.lineTo(9 * scale, -bodyH - 15 * scale);
    ctx.lineTo(8 * scale, -bodyH - 5 * scale);
    ctx.lineTo(-8 * scale, -bodyH - 5 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = enemy.state === "ALERT" || enemy.state === "CHASE" || enemy.state === "ATTACK" ? "#efaa76" : "#ad755d";
    ctx.fillRect(-5 * scale, -bodyH - 11 * scale, 3 * scale, 2 * scale);
    ctx.fillRect(2 * scale, -bodyH - 11 * scale, 3 * scale, 2 * scale);

    ctx.strokeStyle = heavy ? "#c2a36a" : fast ? "#a87874" : "#9b7653";
    ctx.lineWidth = (heavy ? 4 : 3) * scale;
    ctx.beginPath();
    ctx.moveTo(facingScreenX * 7, -bodyH * .55 + facingScreenY * 7);
    ctx.lineTo(facingScreenX * (heavy ? 24 : 20), -bodyH * .55 + facingScreenY * (heavy ? 24 : 20));
    ctx.stroke();

    if (heavy) {
      ctx.strokeStyle = "#77624b";
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(-bodyW - 5 * scale, -bodyH * .75);
      ctx.lineTo(-bodyW - 11 * scale, -bodyH * .28);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-bodyW - 12 * scale, -bodyH * .15, 10 * scale, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fast) {
      ctx.fillStyle = "rgba(115, 66, 67, .75)";
      ctx.beginPath();
      ctx.moveTo(-bodyW * .7, -bodyH * .72);
      ctx.lineTo(-bodyW - 13 * scale, -bodyH * .5);
      ctx.lineTo(-bodyW * .62, -bodyH * .35);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    if (!enemy.dead && (enemy.hp < enemy.maxHp || enemy.barTimer > 0)) {
      const w = (heavy ? 52 : 44) * scale;
      const y = p.y - (heavy ? 78 : 69) * scale;
      ctx.fillStyle = "rgba(6, 12, 10, .78)";
      ctx.fillRect(p.x - w / 2, y, w, 5);
      ctx.fillStyle = heavy ? "#ba6b57" : fast ? "#d47f6c" : "#c66f5e";
      ctx.fillRect(p.x - w / 2 + 1, y + 1, Math.max(0, (w - 2) * (enemy.hp / enemy.maxHp)), 3);
    }
  }

  function drawPlayer() {
    const p = project(player.x, player.y, player.z);
    const scale = camera.zoom;
    const bob = player.state === "walk" || player.state === "run"
      ? Math.sin(player.stepTime * 2.5) * (player.state === "run" ? 2.2 : 1.3) * scale
      : 0;

    for (const image of afterimages) {
      const q = project(image.x, image.y);
      ctx.globalAlpha = Math.max(0, image.life / 0.22) * 0.24;
      ctx.fillStyle = "#78c2af";
      ctx.beginPath();
      ctx.moveTo(q.x, q.y - 54 * scale);
      ctx.lineTo(q.x + 16 * scale, q.y - 25 * scale);
      ctx.lineTo(q.x + 10 * scale, q.y - 2 * scale);
      ctx.lineTo(q.x - 10 * scale, q.y - 2 * scale);
      ctx.lineTo(q.x - 16 * scale, q.y - 25 * scale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    shadow(player.x, player.y, 25, 9, 0.34);
    ctx.save();
    ctx.translate(p.x, p.y + bob);

    const fx = (player.visualFacingX - player.visualFacingY);
    const fy = (player.visualFacingX + player.visualFacingY) * .5;
    const attacking = player.attackTimer > 0;
    const hit = player.hitFlash > 0;

    ctx.fillStyle = player.state === "dash" ? "rgba(86, 154, 144, .35)" : "#203d3e";
    ctx.beginPath();
    ctx.moveTo(-14 * scale, -47 * scale);
    ctx.lineTo(14 * scale, -47 * scale);
    ctx.lineTo(18 * scale, -9 * scale);
    ctx.lineTo(9 * scale, -2 * scale);
    ctx.lineTo(-9 * scale, -2 * scale);
    ctx.lineTo(-18 * scale, -9 * scale);
    ctx.closePath();
    ctx.fill();

    const coat = ctx.createLinearGradient(0, -48 * scale, 0, -2 * scale);
    coat.addColorStop(0, hit ? "#8ccac0" : "#376d71");
    coat.addColorStop(1, hit ? "#669d98" : "#244b50");
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-15 * scale, -46 * scale);
    ctx.lineTo(15 * scale, -46 * scale);
    ctx.lineTo(13 * scale, -14 * scale);
    ctx.lineTo(5 * scale, -3 * scale);
    ctx.lineTo(-5 * scale, -3 * scale);
    ctx.lineTo(-13 * scale, -14 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#b89465";
    ctx.fillRect(-15 * scale, -25 * scale, 30 * scale, 4 * scale);

    ctx.fillStyle = hit ? "#d9f4ea" : "#d8c59d";
    ctx.beginPath();
    ctx.arc(0, -58 * scale, 10 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a302f";
    ctx.beginPath();
    ctx.moveTo(-11 * scale, -61 * scale);
    ctx.lineTo(-5 * scale, -70 * scale);
    ctx.lineTo(7 * scale, -68 * scale);
    ctx.lineTo(12 * scale, -59 * scale);
    ctx.lineTo(7 * scale, -52 * scale);
    ctx.lineTo(-8 * scale, -52 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#a8d5c8";
    ctx.fillRect((-4 + fx * 1.8) * scale, (-60 + fy * 1.8) * scale, 3 * scale, 2 * scale);

    ctx.strokeStyle = "#d9bd72";
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = "round";
    const reach = attacking ? 31 : 23;
    const swing = attacking ? Math.sin((player.attackTimer / .34) * Math.PI) * 9 : 0;
    ctx.beginPath();
    ctx.moveTo(fx * 4 * scale, (-34 + fy * 4) * scale);
    ctx.lineTo((fx * reach + swing) * scale, (-34 + fy * reach - swing * .35) * scale);
    ctx.stroke();
    ctx.lineCap = "butt";

    ctx.fillStyle = "#6e5a43";
    ctx.beginPath();
    ctx.arc(-fx * 7 * scale, (-30 - fy * 7) * scale, 6 * scale, 0, Math.PI * 2);
    ctx.fill();

    if (player.state === "dash") {
      ctx.strokeStyle = "rgba(139, 224, 202, .42)";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(0, -31 * scale, 30 * scale, -.7, 2.3);
      ctx.stroke();
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
    ctx.save();
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 18 * scale);
    glow.addColorStop(0, gold ? "rgba(242, 205, 102, .34)" : "rgba(105, 220, 145, .3)");
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

    const map = (x: number, y: number) => ({ x: x / 1900 * width, y: y / 1500 * height });
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
