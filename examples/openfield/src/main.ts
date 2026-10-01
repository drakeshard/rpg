import { DeterministicRng } from "@drakeshard/foundation/random";
import { FixedStepDriver } from "@drakeshard/foundation/time";

import { updateEnemyAI } from "./ai";
import { createAudio } from "./audio";
import { applyDamage, inAttackArc } from "./combat";
import { bindInput, type InputActions } from "./input";
import type {
  Actor,
  Afterimage,
  Decor,
  Enemy,
  Grass,
  Loot,
  Particle,
  Player,
  Point,
  Prop,
  VisualState,
} from "./model";
import { createRenderer } from "./rendering";
import { PlayerResources } from "./rpg-player-resources";
import { CollisionGrid, makeWorld as generateWorld, OBJECTIVE_KILLS, WORLD } from "./world";

(() => {
  "use strict";

  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const radar = document.getElementById("radar") as HTMLCanvasElement;
  const rctx = radar.getContext("2d")!;
  const element = (id: string) => document.getElementById(id)!;

  const ui = {
    hpBar: element("hpBar"),
    staminaBar: element("staminaBar"),
    hpText: element("hpText"),
    staminaText: element("staminaText"),
    objectiveText: element("objectiveText"),
    fpsText: element("fpsText"),
    enemyText: element("enemyText"),
    entityText: element("entityText"),
    message: element("message"),
    damageFlash: element("damageFlash"),
    startScreen: element("startScreen"),
    endScreen: element("endScreen"),
    endEyebrow: element("endEyebrow"),
    endTitle: element("endTitle"),
    endText: element("endText"),
    goldText: element("goldText"),
    potionText: element("potionText"),
    objectiveStep: element("objectiveStep"),
    interactPrompt: element("interactPrompt"),
    debugPanel: element("debugPanel"),
    debugStats: element("debugStats"),
    attackCooldownText: element("attackCooldownText"),
    dashCooldownText: element("dashCooldownText"),
    potionCountText: element("potionCountText"),
    audioToggle: element("audioToggle"),
    audioPanel: element("audioPanel"),
    muteButton: element("muteButton"),
    questPanel: document.querySelector(".quest-panel") as HTMLElement,
  };

  const audio = createAudio();
  const input = bindInput(canvas, element("startButton"), element("restartButton"), audio.unlock);
  const masterVolume = element("masterVolume") as HTMLInputElement;
  const sfxVolume = element("sfxVolume") as HTMLInputElement;

  ui.audioToggle.addEventListener("click", () => {
    audio.unlock();
    const open = !ui.audioPanel.classList.toggle("hidden");
    ui.audioToggle.setAttribute("aria-expanded", String(open));
  });
  masterVolume.addEventListener("input", () => audio.setMaster(Number(masterVolume.value) / 100));
  sfxVolume.addEventListener("input", () => audio.setSfx(Number(sfxVolume.value) / 100));
  ui.muteButton.addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    ui.muteButton.setAttribute("aria-pressed", String(audio.muted));
    ui.muteButton.textContent = audio.muted ? "Unmute audio" : "Mute audio";
    ui.audioToggle.querySelector("span")!.textContent = audio.muted ? "Muted" : "Sound";
  });

  const stress = new URLSearchParams(location.search).has("stress");
  const demoSprites = new URLSearchParams(location.search).get("sprites") === "demo";
  const fixedStep = new FixedStepDriver({
    stepMs: 1000 / 60,
    maxFrameDeltaMs: 250,
    maxStepsPerFrame: 5,
  });
  const stepSeconds = 1 / 60;

  let gameplayRng = new DeterministicRng(721944);
  let running = false;
  let debug = false;
  let lastTime = performance.now();
  let fpsSmooth = 60;
  let frameMs = 16.7;
  let droppedSteps = 0;
  let messageTimer = 0;
  let activeEnemies = 0;
  let aiUpdates = 0;
  let collisionCandidates = 0;
  let shownKills = -1;
  let footstepDistance = 0;
  let dashTrailTimer = 0;
  let winDelay = 0;

  const range = (min: number, max: number) =>
    min + (max - min) * gameplayRng.nextFloat01();
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const camera = { x: WORLD.width / 2, y: WORLD.height / 2, zoom: 1 };
  const particles: Particle[] = [];
  const props: Prop[] = [];
  const enemies: Enemy[] = [];
  const grass: Grass[] = [];
  const decorative: Decor[] = [];
  const loot: Loot[] = [];
  const afterimages: Afterimage[] = [];
  const damageNumbers: { x: number; y: number; value: string; life: number; color: string }[] = [];
  const visual: VisualState = { time: 0, shake: 0, hitStop: 0, objectivePulse: 0, debug: false };
  const resources = new PlayerResources();
  let grid = new CollisionGrid([], []);

  const player: Player = {
    x: 450,
    y: 760,
    z: 0,
    radius: 24,
    speed: 230,
    hp: resources.health.current,
    maxHp: resources.health.capacity,
    hitFlash: 0,
    stamina: resources.stamina.current,
    maxStamina: resources.stamina.capacity,
    facingX: 1,
    facingY: 0,
    attackCooldown: 0,
    attackTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    invuln: 0,
    kills: 0,
    stepTime: 0,
    state: "idle",
    gold: 0,
    potions: 0,
    vx: 0,
    vy: 0,
    visualFacingX: 1,
    visualFacingY: 0,
    moveAmount: 0,
    dashX: 1,
    dashY: 0,
    deathTimer: 0,
  };

  const renderer = createRenderer({
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
  });

  function syncResources(): void {
    player.hp = resources.health.current;
    player.maxHp = resources.health.capacity;
    player.stamina = resources.stamina.current;
    player.maxStamina = resources.stamina.capacity;
  }

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeWorld(): void {
    const next = generateWorld(stress);
    props.splice(0, props.length, ...next.props);
    enemies.splice(0, enemies.length, ...next.enemies);
    grass.splice(0, grass.length, ...next.grass);
    decorative.splice(0, decorative.length, ...next.decorative);
    particles.length = 0;
    loot.length = 0;
    afterimages.length = 0;
    damageNumbers.length = 0;
    grid = next.grid;
  }

  function resetGame(): void {
    resources.reset();
    gameplayRng = new DeterministicRng(721944);
    fixedStep.reset();
    syncResources();
    player.x = 450;
    player.y = 760;
    player.z = 0;
    player.kills = 0;
    player.gold = 0;
    player.potions = 0;
    player.hitFlash = 0;
    player.state = "idle";
    player.vx = 0;
    player.vy = 0;
    player.visualFacingX = 1;
    player.visualFacingY = 0;
    player.moveAmount = 0;
    player.dashX = 1;
    player.dashY = 0;
    player.deathTimer = 0;
    player.attackCooldown = 0;
    player.attackTimer = 0;
    player.dashCooldown = 0;
    player.dashTimer = 0;
    player.invuln = 0;
    player.facingX = 1;
    player.facingY = 0;
    footstepDistance = 0;
    dashTrailTimer = 0;
    winDelay = 0;
    droppedSteps = 0;
    visual.shake = 0;
    visual.hitStop = 0;
    visual.objectivePulse = 0;
    camera.x = player.x;
    camera.y = player.y;
    camera.zoom = 1;
    makeWorld();
    updateUI();
    hideEnd();
    showMessage("Defeat 8 enemies, then activate the ruin beacon", 2.2);
  }

  function collidesWithProps(x: number, y: number, radius: number): boolean {
    const hit = grid.collides(x, y, radius);
    collisionCandidates += grid.candidates;
    return hit;
  }

  function moveEntity(actor: Actor, dx: number, dy: number): void {
    const nx = clamp(actor.x + dx, 45, WORLD.width - 45);
    const ny = clamp(actor.y + dy, 45, WORLD.height - 45);
    if (!collidesWithProps(nx, actor.y, actor.radius)) actor.x = nx;
    if (!collidesWithProps(actor.x, ny, actor.radius)) actor.y = ny;
  }

  function burst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count && particles.length < 280; i++) {
      const angle = gameplayRng.nextFloat01() * Math.PI * 2;
      const particleSpeed = range(speed * 0.45, speed);
      particles.push({
        x,
        y,
        z: range(6, 28),
        vx: Math.cos(angle) * particleSpeed,
        vy: Math.sin(angle) * particleSpeed,
        vz: range(25, 80),
        life: range(0.35, 0.75),
        maxLife: 0.75,
        color,
        size: range(2, 5),
      });
    }
  }

  function attack(): void {
    if (!running || player.hp <= 0 || player.attackCooldown > 0) return;
    player.attackCooldown = 0.47;
    player.attackTimer = 0.34;
    audio.play("swing");
    for (const enemy of enemies) {
      if (enemy.dead || !inAttackArc(player, enemy, 105, 0.08)) continue;
      damageEnemy(enemy, 32);
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.hypot(dx, dy) || 1;
      moveEntity(enemy, dx / distance * 22, dy / distance * 22);
    }
  }

  function dash(): void {
    if (!running || player.hp <= 0 || player.dashCooldown > 0 || resources.stamina.current < 25) {
      return;
    }
    resources.spendStamina(25);
    syncResources();
    player.dashCooldown = 1.05;
    player.dashTimer = 0.18;
    player.dashX = player.facingX;
    player.dashY = player.facingY;
    player.invuln = Math.max(player.invuln, 0.22);
    player.vx = player.dashX * 840;
    player.vy = player.dashY * 840;
    visual.shake = Math.max(visual.shake, 2.5);
    burst(player.x, player.y, "#c8d5bb", 12, 100);
    audio.play("dash");
  }

  function damagePlayer(amount: number, from: Point | null): void {
    if (player.invuln > 0 || player.hp <= 0) return;
    const dealt = resources.damage(amount);
    syncResources();
    damageNumbers.push({
      x: player.x,
      y: player.y,
      value: String(Math.round(dealt)),
      life: 0.75,
      color: "#ffb0a0",
    });
    player.hitFlash = 0.14;
    player.state = player.hp <= 0 ? "dead" : "hit";
    player.invuln = 0.55;
    visual.shake = Math.max(visual.shake, 3.2);
    audio.play("hurt");
    burst(player.x, player.y, "#e35d58", 9, 90);
    ui.damageFlash.classList.add("active");
    window.setTimeout(() => ui.damageFlash.classList.remove("active"), 160);
    if (from) {
      const dx = player.x - from.x;
      const dy = player.y - from.y;
      const distance = Math.hypot(dx, dy) || 1;
      moveEntity(player, dx / distance * 26, dy / distance * 26);
    }
    if (player.hp <= 0) player.deathTimer = 0;
  }

  function damageEnemy(enemy: Enemy, amount: number): void {
    if (enemy.dead) return;
    const dealt = applyDamage(enemy, amount);
    damageNumbers.push({
      x: enemy.x,
      y: enemy.y,
      value: String(Math.round(dealt)),
      life: 0.75,
      color: "#ffe29a",
    });
    enemy.state = "ALERT";
    enemy.stateTime = 0.15;
    enemy.attackWindup = 0;
    enemy.barTimer = 2.4;
    enemy.alertTargetX = player.x;
    enemy.alertTargetY = player.y;
    visual.hitStop = Math.max(visual.hitStop, enemy.definition.id === "heavy" ? 0.05 : 0.038);
    visual.shake = Math.max(visual.shake, enemy.definition.id === "heavy" ? 3.2 : 2.2);
    audio.play("hit");
    audio.play("enemyHurt");
    burst(enemy.x, enemy.y, "#edba83", 7, 72);

    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.state = "DEAD";
      enemy.deathTimer = 0.65;
      player.kills++;
      if (gameplayRng.nextFloat01() < 0.68) {
        loot.push({
          x: enemy.x,
          y: enemy.y,
          type: gameplayRng.nextFloat01() < 0.78 ? "gold" : "potion",
          amount: 1 + Math.floor(gameplayRng.nextFloat01() * 5),
          picked: false,
          pickupTime: 0,
          age: 0,
        });
      }
      burst(enemy.x, enemy.y, "#d8745e", 14, 110);
      audio.play("enemyDeath");
      showMessage(`Enemy defeated · ${player.kills}/${OBJECTIVE_KILLS}`, 1.1);
      if (player.kills >= OBJECTIVE_KILLS) {
        visual.objectivePulse = 1.5;
        showMessage("Beacon ready — find the ruins", 2);
      }
    }
  }

  function updatePlayer(
    dt: number,
    held: ReadonlySet<string>,
    actions: InputActions,
  ): void {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.hitFlash = Math.max(0, player.hitFlash - dt);

    if (actions.attack) attack();
    if (actions.dash) dash();
    if (actions.interact) interact();
    if (actions.potion) usePotion();

    if (player.hp <= 0) {
      player.deathTimer += dt;
      player.vx = 0;
      player.vy = 0;
      player.moveAmount = 0;
      player.state = "dead";
      return;
    }

    let ix = 0;
    let iy = 0;
    if (held.has("move-up")) iy -= 1;
    if (held.has("move-down")) iy += 1;
    if (held.has("move-left")) ix -= 1;
    if (held.has("move-right")) ix += 1;

    const moving = ix !== 0 || iy !== 0;
    if (moving) {
      const length = Math.hypot(ix, iy);
      ix /= length;
      iy /= length;
      if (player.dashTimer <= 0) {
        player.facingX = ix;
        player.facingY = iy;
      }
    }

    const sprinting =
      moving &&
      player.dashTimer <= 0 &&
      held.has("sprint") &&
      resources.stamina.current > 1;
    const oldX = player.x;
    const oldY = player.y;

    if (player.dashTimer > 0) {
      const dashSpeed = 620 + 260 * (player.dashTimer / 0.18);
      player.vx = player.dashX * dashSpeed;
      player.vy = player.dashY * dashSpeed;
      moveEntity(player, player.vx * dt, player.vy * dt);
      dashTrailTimer -= dt;
      if (dashTrailTimer <= 0) {
        dashTrailTimer = 0.035;
        if (afterimages.length >= 8) afterimages.shift();
        afterimages.push({
          x: player.x,
          y: player.y,
          facingX: player.visualFacingX,
          facingY: player.visualFacingY,
          life: 0.22,
        });
      }
    } else {
      const targetSpeed = player.speed * (sprinting ? 1.48 : 1) * (player.attackTimer > 0 ? 0.75 : 1);
      const response = 1 - Math.exp(-(moving ? 24 : 32) * dt);
      player.vx += ((moving ? ix * targetSpeed : 0) - player.vx) * response;
      player.vy += ((moving ? iy * targetSpeed : 0) - player.vy) * response;
      if (Math.abs(player.vx) < 1) player.vx = 0;
      if (Math.abs(player.vy) < 1) player.vy = 0;
      moveEntity(player, player.vx * dt, player.vy * dt);
    }

    const distance = Math.hypot(player.x - oldX, player.y - oldY);
    if (player.dashTimer <= 0) {
      player.stepTime += distance * 0.07;
      footstepDistance += distance;
      const stride = sprinting ? 92 : 82;
      if (footstepDistance >= stride) {
        footstepDistance -= stride;
        audio.play("footstep");
      }
    }

    if (sprinting) resources.spendStamina(23 * dt);
    else resources.recoverStamina((moving ? 14 : 19) * dt);
    syncResources();

    const turn = 1 - Math.exp(-14 * dt);
    player.visualFacingX += (player.facingX - player.visualFacingX) * turn;
    player.visualFacingY += (player.facingY - player.visualFacingY) * turn;
    const facingLength = Math.hypot(player.visualFacingX, player.visualFacingY) || 1;
    player.visualFacingX /= facingLength;
    player.visualFacingY /= facingLength;
    player.moveAmount +=
      (Math.min(1, distance / (player.speed * dt || 1)) - player.moveAmount) *
      Math.min(1, dt * 12);
    player.state =
      player.hitFlash > 0
        ? "hit"
        : player.dashTimer > 0
          ? "dash"
          : player.attackTimer > 0
            ? "attack"
            : distance > 1
              ? sprinting
                ? "run"
                : "walk"
              : "idle";

    camera.x = clamp(
      camera.x + (player.x + player.vx * 0.045 - camera.x) * Math.min(1, dt * 5.5),
      80,
      WORLD.width - 80,
    );
    camera.y = clamp(
      camera.y + (player.y + player.vy * 0.045 - camera.y) * Math.min(1, dt * 5.5),
      80,
      WORLD.height - 80,
    );
  }

  function updateEnemies(dt: number): void {
    const result = updateEnemyAI(
      dt,
      enemies,
      player,
      moveEntity,
      damagePlayer,
      range,
      () => audio.play("enemyWindup"),
      () => audio.play("enemyStrike"),
    );
    activeEnemies = result.active;
    aiUpdates = result.updates;
  }

  function nearestInteractable(): Decor | Loot | null {
    let nearest: Decor | Loot | null = null;
    let best = 86 * 86;
    for (const item of decorative) {
      if (item.type !== "chest" && item.type !== "campfire" && item.type !== "objective") continue;
      if (item.type === "chest" && item.opened) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < best) {
        nearest = item;
        best = distanceSquared;
      }
    }
    for (const item of loot) {
      if (item.picked) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < best) {
        nearest = item;
        best = distanceSquared;
      }
    }
    return nearest;
  }

  function interact(): void {
    if (!running || player.hp <= 0 || winDelay > 0) return;
    const item = nearestInteractable();
    if (!item) return;

    if (item.type === "gold" || item.type === "potion") {
      item.picked = true;
      item.pickupTime = 0.28;
      if (item.type === "gold") {
        player.gold += item.amount;
        showMessage(`+${item.amount} gold`);
      } else {
        player.potions++;
        showMessage("Health potion acquired · H to drink");
      }
      audio.play("loot");
    } else if (item.type === "chest") {
      item.opened = true;
      item.openTime = 0;
      player.gold += 12;
      player.potions++;
      showMessage("Chest opened · +12 gold, +1 potion", 2);
      audio.play("chest");
    } else if (item.type === "campfire") {
      resources.heal(35);
      syncResources();
      showMessage("Rested at campfire · +35 HP", 1.5);
      audio.play("potion");
    } else if (item.type === "objective") {
      if (player.kills >= OBJECTIVE_KILLS) {
        winDelay = 0.9;
        visual.objectivePulse = 2.3;
        showMessage("The beacon awakens", 1.8);
        audio.play("objective");
      } else {
        showMessage(
          `Defeat ${OBJECTIVE_KILLS - player.kills} more enemies to activate the beacon`,
          1.8,
        );
        audio.play("interact");
      }
    }
  }

  function usePotion(): void {
    if (!running || player.hp <= 0 || player.potions <= 0 || player.hp >= player.maxHp) return;
    player.potions--;
    resources.heal(40);
    syncResources();
    showMessage("Health restored · +40 HP");
    audio.play("potion");
  }

  function updatePrompt(): void {
    const item = nearestInteractable();
    const prompt = item
      ? item.type === "gold"
        ? "[E] Pick up gold"
        : item.type === "potion"
          ? "[E] Pick up potion"
          : item.type === "chest"
            ? "[E] Open Chest"
            : item.type === "campfire"
              ? "[E] Rest at Campfire"
              : player.kills >= OBJECTIVE_KILLS
                ? "[E] Activate Beacon"
                : "[E] Inspect Beacon"
      : "";
    if (ui.interactPrompt.textContent !== prompt) ui.interactPrompt.textContent = prompt;
    ui.interactPrompt.classList.toggle("visible", Boolean(prompt) && running && player.hp > 0);
    if (item && prompt) {
      const position = renderer.project(
        item.x,
        item.y,
        item.type === "objective" ? 80 : item.type === "chest" ? 54 : 42,
      );
      ui.interactPrompt.style.left = `${clamp(position.x, 80, canvas.clientWidth - 80)}px`;
      ui.interactPrompt.style.top = `${clamp(position.y, 60, canvas.clientHeight - 100)}px`;
    }
  }

  function updateEffects(dt: number): void {
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      particle.vz -= 150 * dt;
      if (particle.z < 0) {
        particle.z = 0;
        particle.vz *= -0.2;
      }
      particle.vx *= Math.pow(0.1, dt);
      particle.vy *= Math.pow(0.1, dt);
    }
    for (let index = damageNumbers.length - 1; index >= 0; index--) {
      damageNumbers[index].life -= dt;
      if (damageNumbers[index].life <= 0) damageNumbers.splice(index, 1);
    }
    for (let index = afterimages.length - 1; index >= 0; index--) {
      afterimages[index].life -= dt;
      if (afterimages[index].life <= 0) afterimages.splice(index, 1);
    }
    for (let index = loot.length - 1; index >= 0; index--) {
      loot[index].age += dt;
      if (loot[index].picked) {
        loot[index].pickupTime -= dt;
        if (loot[index].pickupTime <= 0) loot.splice(index, 1);
      }
    }
    for (const item of decorative) {
      if (item.type === "chest" && item.opened && (item.openTime ?? 0) < 0.34) {
        item.openTime = Math.min(0.34, (item.openTime ?? 0) + dt);
      }
    }
    visual.shake = Math.max(0, visual.shake - dt * 14);
    visual.objectivePulse = Math.max(0, visual.objectivePulse - dt);
  }

  function update(dt: number, held: ReadonlySet<string>, actions: InputActions): void {
    if (actions.restart) {
      resetGame();
      running = true;
      ui.startScreen.classList.add("hidden");
    }
    if (actions.debug) {
      debug = !debug;
      visual.debug = debug;
      ui.debugPanel.classList.toggle("hidden", !debug);
    }
    if (actions.zoom) camera.zoom = clamp(camera.zoom - actions.zoom * 0.06, 0.72, 1.35);
    if (!running) return;

    collisionCandidates = 0;
    updatePlayer(dt, held, actions);
    updateEnemies(dt);
    updateEffects(dt);
    updatePrompt();

    if (player.hp <= 0 && player.deathTimer >= 0.85) endGame(false);
    if (winDelay > 0) {
      winDelay -= dt;
      if (winDelay <= 0) endGame(true);
    }
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) ui.message.classList.add("hidden");
    }
    updateUI();
  }

  function updateUI(): void {
    const hpPct = clamp(player.hp / player.maxHp * 100, 0, 100);
    const staminaPct = clamp(player.stamina / player.maxStamina * 100, 0, 100);
    ui.hpBar.style.width = `${hpPct}%`;
    ui.staminaBar.style.width = `${staminaPct}%`;
    ui.hpText.textContent = String(Math.ceil(player.hp));
    ui.staminaText.textContent = String(Math.ceil(player.stamina));
    ui.objectiveText.textContent = `${player.kills} / ${OBJECTIVE_KILLS}`;
    ui.objectiveStep.textContent =
      player.kills >= OBJECTIVE_KILLS ? "Activate beacon" : "Clear hostiles";
    if (shownKills !== player.kills) {
      if (shownKills >= 0) {
        ui.questPanel.classList.remove("updated");
        void ui.questPanel.clientWidth;
        ui.questPanel.classList.add("updated");
      }
      shownKills = player.kills;
    }
    ui.goldText.textContent = String(player.gold);
    ui.potionText.textContent = String(player.potions);
    ui.attackCooldownText.textContent =
      player.attackCooldown > 0 ? `${player.attackCooldown.toFixed(1)}S` : "READY";
    ui.dashCooldownText.textContent =
      player.dashCooldown > 0 ? `${player.dashCooldown.toFixed(1)}S` : "READY";
    ui.potionCountText.textContent = `${player.potions} LEFT`;
    ui.attackCooldownText.parentElement!.classList.toggle("cooling", player.attackCooldown > 0);
    ui.dashCooldownText.parentElement!.classList.toggle("cooling", player.dashCooldown > 0);
    element("game-shell").classList.toggle("low-health", player.hp > 0 && player.hp <= 25);
    let alive = 0;
    for (const enemy of enemies) if (!enemy.dead) alive++;
    ui.enemyText.textContent = String(alive);
    ui.entityText.textContent = String(
      props.length + decorative.length + enemies.length + 1 + particles.length + loot.length,
    );
    if (debug) {
      ui.debugStats.textContent =
        `Frame   ${frameMs.toFixed(1)} ms\n` +
        `Player  ${player.x.toFixed(0)}, ${player.y.toFixed(0)}\n` +
        `Enemies ${alive} / ${enemies.length}\n` +
        `Active  ${activeEnemies}\n` +
        `Visible ${renderer.visibleEntities}\n` +
        `Objects ${props.length + decorative.length}\n` +
        `Collide ${collisionCandidates}\n` +
        `AI ticks ${aiUpdates}\n` +
        `Dropped ${droppedSteps}`;
    }
  }

  function showMessage(text: string, seconds = 1): void {
    ui.message.textContent = text;
    ui.message.classList.remove("hidden");
    messageTimer = seconds;
  }

  function endGame(win: boolean): void {
    running = false;
    ui.interactPrompt.classList.remove("visible");
    ui.endScreen.classList.toggle("win-toast", win);
    ui.endEyebrow.textContent = win ? "MISSION COMPLETE" : "RUN ENDED";
    ui.endTitle.textContent = win ? "Field Cleared" : "You Were Defeated";
    ui.endText.textContent = win
      ? "The beacon is active. Greywood Outskirts are secure."
      : "The enemies overwhelmed you. Restart and try a different route.";
    ui.endScreen.classList.remove("hidden");
  }

  function hideEnd(): void {
    ui.endScreen.classList.add("hidden");
  }

  function loop(now: number): void {
    const rawDeltaMs = now - lastTime;
    lastTime = now;
    const rawDeltaSeconds = rawDeltaMs / 1000;
    visual.time += rawDeltaSeconds;
    if (rawDeltaSeconds > 0) {
      fpsSmooth += (1 / rawDeltaSeconds - fpsSmooth) * 0.08;
    }
    frameMs = rawDeltaMs;
    ui.fpsText.textContent = String(Math.round(fpsSmooth));

    if (visual.hitStop > 0) {
      visual.hitStop = Math.max(0, visual.hitStop - rawDeltaSeconds);
      fixedStep.reset();
    } else {
      const advance = fixedStep.advance(Math.max(0, rawDeltaMs));
      droppedSteps += advance.droppedSteps;
      for (let step = 0; step < advance.steps; step++) {
        const tick = input.consumeTick();
        update(stepSeconds, tick.held, tick.actions);
      }
    }

    renderer.render();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  resize();
  makeWorld();
  updateUI();
  renderer.render();
  requestAnimationFrame(loop);
})();
