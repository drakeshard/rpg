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
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#263c31");
    gradient.addColorStop(1, "#172b25");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(203, 219, 183, .035)";
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
    if (!visible(item.x, item.y, 80)) return;
    visibleEntities++;
    const p = project(item.x, item.y);
    const s = item.scale * camera.zoom;
    shadow(item.x, item.y, item.radius * item.scale, item.radius * item.scale * 0.32);
    if (item.type === "tree") {
      ctx.fillStyle = "#604a35";
      ctx.fillRect(p.x - 4 * s, p.y - 36 * s, 8 * s, 35 * s);
      ctx.fillStyle = "#355b3c";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 49 * s, 25 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#46714a";
      ctx.beginPath();
      ctx.arc(p.x - 12 * s, p.y - 43 * s, 18 * s, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (item.type === "bush") {
      ctx.fillStyle = "#426f48";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 10 * s, 22 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = item.type === "wall" ? "#707b75" : item.type === "crate" ? "#8b613e" : "#6d6758";
    ctx.beginPath();
    ctx.roundRect(p.x - 16 * s, p.y - 22 * s, 32 * s, 21 * s, 4 * s);
    ctx.fill();
  }

  function drawDecor(item: Decor) {
    if (!visible(item.x, item.y, 120)) return;
    visibleEntities++;
    const p = project(item.x, item.y);
    const s = item.scale * camera.zoom;
    shadow(item.x, item.y, item.radius * item.scale, item.radius * item.scale * 0.32);
    if (item.type === "objective") {
      const ready = player.kills >= 8;
      ctx.fillStyle = ready ? "#83dfc8" : "#73938a";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 70 * s);
      ctx.lineTo(p.x + 18 * s, p.y - 28 * s);
      ctx.lineTo(p.x, p.y - 10 * s);
      ctx.lineTo(p.x - 18 * s, p.y - 28 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ready ? "#c2f6e7" : "#90aaa2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 30 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (item.type === "campfire") {
      ctx.fillStyle = "#8a7052";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 20 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      const flicker = Math.sin(visual.time * 11) * 5;
      ctx.fillStyle = "#e78645";
      ctx.beginPath();
      ctx.moveTo(p.x - 10 * s, p.y - 3 * s);
      ctx.lineTo(p.x + flicker * 0.25, p.y - 35 * s);
      ctx.lineTo(p.x + 10 * s, p.y - 3 * s);
      ctx.fill();
      return;
    }
    if (item.type === "chest") {
      ctx.fillStyle = item.opened ? "#66503a" : "#9a6840";
      ctx.fillRect(p.x - 20 * s, p.y - 23 * s, 40 * s, 20 * s);
      ctx.fillStyle = "#d0ad64";
      ctx.fillRect(p.x - 3 * s, p.y - 23 * s, 6 * s, 18 * s);
      return;
    }
    ctx.fillStyle = item.type === "ruin" ? "#68746f" : "#6a5540";
    ctx.fillRect(p.x - 23 * s, p.y - 48 * s, 46 * s, 46 * s);
  }

  function drawEnemy(enemy: Enemy) {
    if (enemy.dead && enemy.deathTimer <= 0) return;
    if (!visible(enemy.x, enemy.y, 100)) return;
    visibleEntities++;
    const p = project(enemy.x, enemy.y, enemy.z);
    const alpha = enemy.dead ? Math.max(0.18, enemy.deathTimer / 0.65) : 1;
    shadow(enemy.x, enemy.y, 22, 8, 0.28 * alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (demoSprites) {
      ctx.fillStyle = enemy.hitFlash > 0 ? "#f0c6a8" : enemy.definition.color;
      ctx.fillRect(p.x - 13 * camera.zoom, p.y - 48 * camera.zoom, 26 * camera.zoom, 42 * camera.zoom);
      ctx.fillStyle = "#d4c49f";
      ctx.fillRect(p.x - 9 * camera.zoom, p.y - 58 * camera.zoom, 18 * camera.zoom, 12 * camera.zoom);
    } else {
      ctx.fillStyle = enemy.hitFlash > 0 ? "#efc7ac" : enemy.definition.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 28 * camera.zoom, 18 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#40352f";
      ctx.fillRect(p.x - 12 * camera.zoom, p.y - 24 * camera.zoom, 24 * camera.zoom, 24 * camera.zoom);
    }
    ctx.restore();
    if (!enemy.dead && enemy.hp < enemy.maxHp) {
      const w = 42 * camera.zoom;
      ctx.fillStyle = "rgba(18,22,19,.8)";
      ctx.fillRect(p.x - w / 2, p.y - 68 * camera.zoom, w, 4);
      ctx.fillStyle = "#d87568";
      ctx.fillRect(p.x - w / 2, p.y - 68 * camera.zoom, w * (enemy.hp / enemy.maxHp), 4);
    }
  }

  function drawPlayer() {
    const p = project(player.x, player.y, player.z);
    for (const image of afterimages) {
      const q = project(image.x, image.y);
      ctx.globalAlpha = Math.max(0, image.life / 0.22) * 0.25;
      ctx.fillStyle = "#9dc2b8";
      ctx.beginPath();
      ctx.arc(q.x, q.y - 27 * camera.zoom, 17 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    shadow(player.x, player.y, 23, 9, 0.32);
    if (demoSprites) {
      ctx.fillStyle = player.hitFlash > 0 ? "#c7f0eb" : "#467c88";
      ctx.fillRect(p.x - 14 * camera.zoom, p.y - 52 * camera.zoom, 28 * camera.zoom, 46 * camera.zoom);
      ctx.fillStyle = "#e2d29d";
      ctx.fillRect(p.x - 9 * camera.zoom, p.y - 63 * camera.zoom, 18 * camera.zoom, 13 * camera.zoom);
    } else {
      ctx.fillStyle = player.hitFlash > 0 ? "#bfe9e4" : "#3e6871";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 37 * camera.zoom, 17 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#273f45";
      ctx.beginPath();
      ctx.moveTo(p.x - 16 * camera.zoom, p.y - 35 * camera.zoom);
      ctx.lineTo(p.x + 16 * camera.zoom, p.y - 35 * camera.zoom);
      ctx.lineTo(p.x + 12 * camera.zoom, p.y - 4 * camera.zoom);
      ctx.lineTo(p.x - 12 * camera.zoom, p.y - 4 * camera.zoom);
      ctx.closePath();
      ctx.fill();
    }
    const fx = (player.facingX - player.facingY) * 18 * camera.zoom;
    const fy = (player.facingX + player.facingY) * 9 * camera.zoom;
    ctx.strokeStyle = "#ead697";
    ctx.lineWidth = 3 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 30 * camera.zoom);
    ctx.lineTo(p.x + fx, p.y - 30 * camera.zoom + fy);
    ctx.stroke();
  }

  function drawLoot(item: Loot) {
    if (item.picked || !visible(item.x, item.y, 40)) return;
    visibleEntities++;
    const p = project(item.x, item.y, 8 + Math.sin(visual.time * 4 + item.x) * 3);
    ctx.fillStyle = item.type === "gold" ? "#efce69" : "#80dba0";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7 * camera.zoom, 0, Math.PI * 2);
    ctx.fill();
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
    rctx.fillStyle = "#173129";
    rctx.beginPath();
    rctx.arc(width / 2, height / 2, width / 2 - 2, 0, Math.PI * 2);
    rctx.fill();
    rctx.save();
    rctx.beginPath();
    rctx.arc(width / 2, height / 2, width / 2 - 3, 0, Math.PI * 2);
    rctx.clip();
    const map = (x: number, y: number) => ({ x: x / 1900 * width, y: y / 1500 * height });
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const p = map(enemy.x, enemy.y);
      rctx.fillStyle = "#da7463";
      rctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    const objective = decorative.find((item) => item.type === "objective");
    if (objective) {
      const p = map(objective.x, objective.y);
      rctx.strokeStyle = "#d9c778";
      rctx.lineWidth = 2;
      rctx.beginPath();
      rctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      rctx.stroke();
    }
    const p = map(player.x, player.y);
    rctx.fillStyle = "#b9f3e4";
    rctx.beginPath();
    rctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    rctx.fill();
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
