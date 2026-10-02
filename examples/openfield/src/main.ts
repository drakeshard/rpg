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
import { EQUIPMENT } from "./progression-content";
import { createRenderer } from "./rendering";
import { equipmentDropForArea, OpenfieldProgression, type QuestUpdate } from "./openfield-progression";
import { PlayerResources } from "./rpg-player-resources";
import type { EquipmentId, WardenSkillChoice } from "./rpg-player-profile";
import { SPAWN_LIMITS, SpawnDirector, type SpawnDirectorStats } from "./spawn-director";
import { areaAt, CollisionGrid, makeWorld as generateWorld, WORLD } from "./world";

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
    areaName: element("areaName"),
    rankText: element("rankText"),
    xpBar: element("xpBar"),
    xpText: element("xpText"),
    progressionPanel: element("progressionPanel"),
    progressionToggle: element("progressionToggle"),
    progressionClose: element("progressionClose"),
    panelRank: element("panelRank"),
    skillPointsText: element("skillPointsText"),
    strengthText: element("strengthText"),
    agilityText: element("agilityText"),
    vitalityText: element("vitalityText"),
    bladeSkillButton: element("bladeSkillButton"),
    windSkillButton: element("windSkillButton"),
    heartSkillButton: element("heartSkillButton"),
    bladeSkillRank: element("bladeSkillRank"),
    windSkillRank: element("windSkillRank"),
    heartSkillRank: element("heartSkillRank"),
    weaponText: element("weaponText"),
    armorText: element("armorText"),
    charmText: element("charmText"),
    inventoryList: element("inventoryList"),
    skill1CooldownText: element("skill1CooldownText"),
    skill2CooldownText: element("skill2CooldownText"),
    skill3CooldownText: element("skill3CooldownText"),
    skill2Slot: element("skill2Slot"),
    skill3Slot: element("skill3Slot"),
    skillPointsMirror: element("skillPointsMirror"),
    powerText: element("powerText"),
    armorStatText: element("armorStatText"),
    healthStatText: element("healthStatText"),
    speedStatText: element("speedStatText"),
    loadoutCards: element("loadoutCards"),
    aegisUnlockNode: element("aegisUnlockNode"),
    windUnlockNode: element("windUnlockNode"),
    itemDetailRarity: element("itemDetailRarity"),
    itemDetailIcon: element("itemDetailIcon"),
    itemDetailName: element("itemDetailName"),
    itemDetailDescription: element("itemDetailDescription"),
    itemDetailStats: element("itemDetailStats"),
    itemEquipButton: element("itemEquipButton") as HTMLButtonElement,
    eventBanner: element("eventBanner"),
    eventBannerKicker: element("eventBannerKicker"),
    eventBannerTitle: element("eventBannerTitle"),
    eventBannerText: element("eventBannerText"),
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

  let activeRpgTab: "character" | "skills" | "inventory" = "character";
  let inventoryFilter: "all" | "weapon" | "armor" | "charm" = "all";
  let selectedEquipment: EquipmentId | null = null;
  let eventBannerTimer = 0;

  const setRpgTab = (tab: "character" | "skills" | "inventory") => {
    activeRpgTab = tab;
    for (const button of Array.from(ui.progressionPanel.querySelectorAll<HTMLElement>("[data-rpg-tab]"))) {
      button.classList.toggle("active", button.dataset.rpgTab === tab);
    }
    for (const view of Array.from(ui.progressionPanel.querySelectorAll<HTMLElement>("[data-rpg-view]"))) {
      view.classList.toggle("active", view.dataset.rpgView === tab);
    }
    audio.play("uiSelect");
  };

  const toggleProgression = (force?: boolean) => {
    const open = force ?? ui.progressionPanel.classList.contains("hidden");
    ui.progressionPanel.classList.toggle("hidden", !open);
    if (open) {
      audio.play("uiOpen");
      updateUI();
    } else {
      audio.play("uiClose");
    }
  };

  const showEventBanner = (kicker: string, title: string, text: string, seconds = 2.1) => {
    ui.eventBannerKicker.textContent = kicker;
    ui.eventBannerTitle.textContent = title;
    ui.eventBannerText.textContent = text;
    ui.eventBanner.classList.remove("hidden", "reveal");
    void ui.eventBanner.clientWidth;
    ui.eventBanner.classList.add("reveal");
    eventBannerTimer = seconds;
  };

  ui.progressionToggle.addEventListener("click", () => toggleProgression());
  ui.progressionClose.addEventListener("click", () => toggleProgression(false));
  for (const button of Array.from(ui.progressionPanel.querySelectorAll<HTMLElement>("[data-rpg-tab]"))) {
    button.addEventListener("click", () => {
      const tab = button.dataset.rpgTab;
      if (tab === "character" || tab === "skills" || tab === "inventory") setRpgTab(tab);
    });
  }
  for (const button of Array.from(ui.progressionPanel.querySelectorAll<HTMLElement>("[data-slot-focus]"))) {
    button.addEventListener("click", () => {
      const slot = button.dataset.slotFocus;
      if (slot === "weapon" || slot === "armor" || slot === "charm") {
        inventoryFilter = slot;
        selectedEquipment = progression.profile.equipped(slot);
        setRpgTab("inventory");
        updateUI();
      }
    });
  }
  for (const button of Array.from(ui.progressionPanel.querySelectorAll<HTMLElement>("[data-inventory-filter]"))) {
    button.addEventListener("click", () => {
      const filter = button.dataset.inventoryFilter;
      if (filter === "all" || filter === "weapon" || filter === "armor" || filter === "charm") {
        inventoryFilter = filter;
        audio.play("uiSelect");
        updateUI();
      }
    });
  }

  const spendNode = (choice: WardenSkillChoice) => {
    const beforeAegis = progression.ownsSkill("aegis-burst");
    const beforeWind = progression.ownsSkill("wind-step");
    if (progression.spendSkillPoint(choice)) {
      syncDerivedStats();
      audio.play("skillUnlock");
      emitRing(player.x, player.y, "#e9d58e", 15, 65, 135);
      showEventBanner("DISCIPLINE ADVANCED", "Warden path strengthened", "A discipline point has been committed.");
      if (!beforeAegis && progression.ownsSkill("aegis-burst")) {
        showEventBanner("ABILITY UNLOCKED", "Aegis Burst", "Press 2 to release a defensive shockwave.", 2.5);
      } else if (!beforeWind && progression.ownsSkill("wind-step")) {
        showEventBanner("ABILITY UNLOCKED", "Wind Step", "Press 3 for an extended invulnerable dash.", 2.5);
      }
      updateUI();
    } else {
      audio.play("interact");
      showMessage("No discipline point available or node is at maximum rank", 1.2);
    }
  };
  ui.bladeSkillButton.addEventListener("click", () => spendNode("blade-mastery"));
  ui.windSkillButton.addEventListener("click", () => spendNode("wind-discipline"));
  ui.heartSkillButton.addEventListener("click", () => spendNode("iron-heart"));

  ui.inventoryList.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-equipment]");
    const id = target?.dataset.equipment as EquipmentId | undefined;
    if (!id) return;
    selectedEquipment = id;
    audio.play("uiSelect");
    updateUI();
  });
  ui.itemEquipButton.addEventListener("click", () => {
    if (!selectedEquipment || !progression.equip(selectedEquipment)) return;
    syncDerivedStats();
    audio.play("equipment");
    emitRing(player.x, player.y, "#d3b66d", 12, 55, 110);
    showEventBanner("EQUIPMENT CHANGED", EQUIPMENT[selectedEquipment].name, "Loadout bonuses recalculated.", 1.7);
    updateUI();
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
  let attackHitResolved = true;

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
  const progression = new OpenfieldProgression();
  const spawnDirector = new SpawnDirector();
  let spawnStats: SpawnDirectorStats = {
    area: areaAt(450, 760),
    targetAlive: SPAWN_LIMITS.targetBase,
    alive: 0,
    totalAllocated: 0,
  };
  let grid = new CollisionGrid([], []);

  const player: Player = {
    x: 450,
    y: 760,
    z: 0,
    radius: 24,
    speed: progression.stats.moveSpeed,
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
    objectiveReady: () => progression.currentQuest?.id === "beacon",
  });

  function syncResources(): void {
    player.hp = resources.health.current;
    player.maxHp = resources.health.capacity;
    player.stamina = resources.stamina.current;
    player.maxStamina = resources.stamina.capacity;
  }

  function syncDerivedStats(): void {
    const stats = progression.stats;
    resources.setHealthCapacity(stats.maxHealth);
    resources.setStaminaCapacity(stats.maxStamina);
    player.speed = stats.moveSpeed;
    syncResources();
  }

  function handleQuestUpdate(update: QuestUpdate | null): void {
    if (!update?.completed) return;
    player.gold += update.rewardGold;
    if (update.rankGained > 0) syncDerivedStats();
    audio.play("questComplete");
    emitRing(player.x, player.y, "#dfc875", 20, 70, 120);
    showEventBanner(
      "QUEST COMPLETE",
      update.completed.title,
      `+${update.rewardXp} XP · +${update.rewardGold} gold`,
      2.6,
    );
    showMessage(
      `Quest complete: ${update.completed.title} · +${update.rewardXp} XP · +${update.rewardGold} gold`,
      2.6,
    );
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
    spawnDirector.reset();
    spawnStats = {
      area: areaAt(player.x, player.y),
      targetAlive: SPAWN_LIMITS.targetBase,
      alive: enemies.filter((enemy) => !enemy.dead).length,
      totalAllocated: enemies.length,
    };
  }

  function resetGame(): void {
    resources.reset();
    progression.reset();
    gameplayRng = new DeterministicRng(721944);
    fixedStep.reset();
    syncDerivedStats();
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
    attackHitResolved = true;
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
    showMessage("Begin the Warden trial: break the Greywood patrol", 2.2);
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

  function emitRing(
    x: number,
    y: number,
    color: string,
    count: number,
    radius: number,
    speed: number,
  ): void {
    for (let i = 0; i < count && particles.length < SPAWN_LIMITS.maxParticles; i++) {
      const angle = (i / count) * Math.PI * 2;
      const wobble = range(-0.06, 0.06);
      particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        z: range(5, 18),
        vx: Math.cos(angle + wobble) * speed,
        vy: Math.sin(angle + wobble) * speed,
        vz: range(18, 48),
        life: range(0.38, 0.62),
        maxLife: 0.62,
        color,
        size: range(2, 4.5),
      });
    }
  }

  function emitArc(
    x: number,
    y: number,
    facingX: number,
    facingY: number,
    color: string,
    count: number,
    radius: number,
  ): void {
    const base = Math.atan2(facingY, facingX);
    for (let i = 0; i < count && particles.length < SPAWN_LIMITS.maxParticles; i++) {
      const t = count <= 1 ? 0.5 : i / (count - 1);
      const angle = base - 1.1 + t * 2.2;
      particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        z: 14 + Math.sin(t * Math.PI) * 18,
        vx: Math.cos(angle) * range(70, 130),
        vy: Math.sin(angle) * range(70, 130),
        vz: range(20, 55),
        life: range(0.25, 0.48),
        maxLife: 0.48,
        color,
        size: range(2.5, 5),
      });
    }
  }

  function emitWindWake(x: number, y: number, facingX: number, facingY: number): void {
    const sideX = -facingY;
    const sideY = facingX;
    for (let i = 0; i < 18 && particles.length < SPAWN_LIMITS.maxParticles; i++) {
      const side = range(-34, 34);
      particles.push({
        x: x - facingX * range(0, 65) + sideX * side,
        y: y - facingY * range(0, 65) + sideY * side,
        z: range(4, 24),
        vx: -facingX * range(90, 180) + sideX * range(-35, 35),
        vy: -facingY * range(90, 180) + sideY * range(-35, 35),
        vz: range(8, 35),
        life: range(0.28, 0.5),
        maxLife: 0.5,
        color: "#b8f2df",
        size: range(2, 4),
      });
    }
  }

  function attack(): void {
    if (!running || player.hp <= 0 || player.attackCooldown > 0) return;
    player.attackCooldown = 0.47;
    player.attackTimer = 0.34;
    attackHitResolved = false;
    audio.play("swing");
  }

  function resolveAttackContact(): void {
    if (attackHitResolved || player.attackTimer <= 0) return;
    const phase = 1 - player.attackTimer / 0.34;
    if (phase < 0.36) return;
    attackHitResolved = true;

    let hitCount = 0;
    for (const enemy of enemies) {
      if (enemy.dead || !inAttackArc(player, enemy, 105, 0.08)) continue;
      hitCount++;
      damageEnemy(enemy, progression.stats.strikeDamage);
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.hypot(dx, dy) || 1;
      moveEntity(enemy, dx / distance * 22, dy / distance * 22);
      burst(enemy.x, enemy.y, "#fff0bd", 4, 125);
    }

    if (hitCount > 0) {
      player.vx += player.facingX * 34;
      player.vy += player.facingY * 34;
      visual.shake = Math.max(visual.shake, hitCount > 1 ? 3 : 2.3);
    }
  }

  function useSkill(slot: 1 | 2 | 3): void {
    if (!running || player.hp <= 0) return;

    if (slot === 1) {
      if (resources.stamina.current < 20 || !progression.triggerSkill("crescent-arc", 2.8)) return;
      resources.spendStamina(20);
      syncResources();
      let hits = 0;
      for (const enemy of enemies) {
        if (enemy.dead || !inAttackArc(player, enemy, 155, -0.15)) continue;
        damageEnemy(enemy, Math.round(progression.stats.strikeDamage * 0.78));
        hits++;
      }
      emitArc(player.x, player.y, player.facingX, player.facingY, "#f3e7aa", 24, 72);
      burst(player.x + player.facingX * 70, player.y + player.facingY * 70, "#d8efca", 12, 145);
      audio.play("skillArc");
      visual.shake = Math.max(visual.shake, hits > 0 ? 3 : 1.4);
      showMessage(hits > 0 ? `Crescent Arc · ${hits} hit${hits === 1 ? "" : "s"}` : "Crescent Arc", 0.8);
      return;
    }

    if (slot === 2) {
      if (!progression.ownsSkill("aegis-burst")) {
        showMessage("Aegis Burst unlocks at Blade Mastery II", 1.1);
        return;
      }
      if (resources.stamina.current < 35 || !progression.triggerSkill("aegis-burst", 7)) return;
      resources.spendStamina(35);
      syncResources();
      player.invuln = Math.max(player.invuln, 0.45);
      for (const enemy of enemies) {
        if (enemy.dead || Math.hypot(enemy.x - player.x, enemy.y - player.y) > 130) continue;
        damageEnemy(enemy, Math.round(progression.stats.strikeDamage * 0.62));
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const length = Math.hypot(dx, dy) || 1;
        moveEntity(enemy, dx / length * 70, dy / length * 70);
      }
      emitRing(player.x, player.y, "#a9f0da", 28, 34, 190);
      emitRing(player.x, player.y, "#e8d798", 16, 68, 110);
      burst(player.x, player.y, "#9be0d0", 18, 175);
      audio.play("skillAegis");
      visual.shake = Math.max(visual.shake, 4);
      showMessage("Aegis Burst", 0.8);
      return;
    }

    if (!progression.ownsSkill("wind-step")) {
      showMessage("Wind Step unlocks at Wind Discipline II", 1.1);
      return;
    }
    if (resources.stamina.current < 30 || !progression.triggerSkill("wind-step", 5)) return;
    resources.spendStamina(30);
    syncResources();
    player.dashTimer = 0.3;
    player.dashX = player.facingX;
    player.dashY = player.facingY;
    player.invuln = Math.max(player.invuln, 0.34);
    player.vx = player.dashX * 1050;
    player.vy = player.dashY * 1050;
    emitWindWake(player.x, player.y, player.facingX, player.facingY);
    burst(player.x, player.y, "#b9f4e1", 12, 150);
    audio.play("skillWind");
    showMessage("Wind Step", 0.7);
  }

  function dash(): void {
    if (!running || player.hp <= 0 || player.dashCooldown > 0 || resources.stamina.current < 25) {
      return;
    }
    resources.spendStamina(25);
    syncResources();
    player.dashCooldown = progression.stats.dashCooldown;
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
    const mitigated = Math.max(1, amount - progression.stats.armor * 0.45);
    const dealt = resources.damage(mitigated);
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
      const areaId = enemy.spawnArea ?? areaAt(enemy.x, enemy.y).id;
      const baseXp = enemy.definition.id === "heavy" ? 38 : enemy.definition.id === "fast" ? 24 : 20;
      const rankGained = progression.addXp(baseXp);
      if (rankGained > 0) {
        syncDerivedStats();
        audio.play("rankUp");
        emitRing(player.x, player.y, "#f0d78b", 30, 45, 155);
        emitRing(player.x, player.y, "#a8e1cc", 20, 78, 105);
        showEventBanner(
          "WARDEN RANK ADVANCED",
          `Rank ${progression.profile.rank}`,
          `+${rankGained} discipline point${rankGained === 1 ? "" : "s"} awarded`,
          2.5,
        );
        showMessage(`Warden rank advanced to ${progression.profile.rank}`, 1.8);
      }
      handleQuestUpdate(progression.recordKill(areaId));
      const equipmentDrop = equipmentDropForArea(areaId, () => gameplayRng.nextFloat01());
      if (equipmentDrop !== null && loot.length < SPAWN_LIMITS.maxLoot) {
        loot.push({
          x: enemy.x + 8,
          y: enemy.y - 6,
          type: "equipment",
          amount: 1,
          equipment: equipmentDrop,
          picked: false,
          pickupTime: 0,
          age: 0,
        });
      }
      if (gameplayRng.nextFloat01() < 0.68 && loot.length < SPAWN_LIMITS.maxLoot) {
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
      if (progression.currentQuest?.id === "beacon") {
        visual.objectivePulse = 1.5;
        showMessage("Beacon quest active — push east to the Broken Ruins", 1.8);
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
    progression.updateCooldowns(dt);

    if (actions.progression) toggleProgression();
    if (actions.skill1) useSkill(1);
    if (actions.skill2) useSkill(2);
    if (actions.skill3) useSkill(3);
    if (actions.attack) attack();
    resolveAttackContact();
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

    if (item.type === "gold" || item.type === "potion" || item.type === "equipment") {
      item.picked = true;
      item.pickupTime = 0.28;
      if (item.type === "gold") {
        player.gold += item.amount;
        showMessage(`+${item.amount} gold`);
      } else if (item.type === "potion") {
        player.potions++;
        showMessage("Health potion acquired · H to drink");
      } else if (item.equipment) {
        const result = progression.collectEquipment(item.equipment as EquipmentId);
        syncDerivedStats();
        audio.play("equipment");
        emitRing(item.x, item.y, "#b99af3", 14, 22, 85);
        showEventBanner(
          result.equipped ? "EQUIPMENT UPGRADE" : "EQUIPMENT ACQUIRED",
          result.item.name,
          result.equipped ? "Automatically equipped as the stronger field item." : result.item.description,
          2,
        );
        showMessage(
          result.equipped ? `${result.item.name} acquired and equipped` : `${result.item.name} acquired`,
          1.5,
        );
      } else {
        audio.play("loot");
      }
    } else if (item.type === "chest") {
      item.opened = true;
      item.openTime = 0;
      player.gold += 12;
      player.potions++;
      showMessage("Chest opened · +12 gold, +1 potion", 2);
      audio.play("chest");
    } else if (item.type === "campfire") {
      const healing = 35 + progression.profile.skillRank("iron-heart") * 8;
      resources.heal(healing);
      syncResources();
      showMessage(`Rested at campfire · +${healing} HP`, 1.5);
      audio.play("potion");
    } else if (item.type === "objective") {
      if (progression.currentQuest?.id === "beacon") {
        handleQuestUpdate(progression.recordBeacon());
        progression.profile.equip("charm", "beacon-sigil");
        progression.inventory.add("beacon-sigil");
        syncDerivedStats();
        winDelay = 0.9;
        visual.objectivePulse = 2.3;
        showMessage("The beacon awakens · Beacon Sigil equipped", 1.8);
        audio.play("objective");
      } else {
        showMessage("The beacon remains dormant. Complete your current field objective first.", 1.8);
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
          : item.type === "equipment"
            ? `[E] Take ${item.equipment ? EQUIPMENT[item.equipment as EquipmentId].name : "equipment"}`
          : item.type === "chest"
            ? "[E] Open Chest"
            : item.type === "campfire"
              ? "[E] Rest at Campfire"
              : progression.currentQuest?.id === "beacon"
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
      } else if (loot[index].age > SPAWN_LIMITS.lootLifetimeSeconds) {
        loot.splice(index, 1);
      }
    }
    if (damageNumbers.length > SPAWN_LIMITS.maxDamageNumbers) {
      damageNumbers.splice(0, damageNumbers.length - SPAWN_LIMITS.maxDamageNumbers);
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
    spawnStats = spawnDirector.update(
      dt,
      enemies,
      player,
      progression.profile.rankIndex,
      () => gameplayRng.nextFloat01(),
      (x, y, radius) => grid.collides(x, y, radius),
    );
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
    if (eventBannerTimer > 0) {
      eventBannerTimer -= dt;
      if (eventBannerTimer <= 0) ui.eventBanner.classList.add("hidden");
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
    const quest = progression.currentQuest;
    ui.objectiveText.textContent = quest ? `${Math.min(progression.questProgress, quest.target)} / ${quest.target}` : "DONE";
    ui.objectiveStep.textContent = quest?.title ?? "Greywood secured";
    ui.areaName.textContent = spawnStats.area.name.toUpperCase();
    ui.rankText.textContent = progression.profile.rank;
    ui.panelRank.textContent = progression.profile.rank;
    const nextXp = progression.profile.nextRankXp;
    const currentFloor = progression.profile.rankIndex === 0 ? 0 : (progression.profile.rankIndex < 6 ? [0,120,310,600,1000,1550][progression.profile.rankIndex] ?? 0 : 0);
    const xpPct = nextXp === null ? 100 : Math.max(0, Math.min(100, ((progression.profile.xp - currentFloor) / Math.max(1, nextXp - currentFloor)) * 100));
    ui.xpBar.style.width = `${xpPct}%`;
    ui.xpText.textContent = nextXp === null ? `${progression.profile.xp} XP · MAX` : `${progression.profile.xp} / ${nextXp} XP`;
    ui.skillPointsText.textContent = String(progression.profile.skillPoints);
    ui.skillPointsMirror.textContent = String(progression.profile.skillPoints);
    ui.strengthText.textContent = String(progression.profile.attribute("strength"));
    ui.agilityText.textContent = String(progression.profile.attribute("agility"));
    ui.vitalityText.textContent = String(progression.profile.attribute("vitality"));
    const bladeRank = progression.profile.skillRank("blade-mastery");
    const windRank = progression.profile.skillRank("wind-discipline");
    const heartRank = progression.profile.skillRank("iron-heart");
    ui.bladeSkillRank.textContent = `${bladeRank} / 3`;
    ui.windSkillRank.textContent = `${windRank} / 3`;
    ui.heartSkillRank.textContent = `${heartRank} / 3`;
    for (const [choice, rank] of [
      ["blade-mastery", bladeRank],
      ["wind-discipline", windRank],
      ["iron-heart", heartRank],
    ] as const) {
      const pips = ui.progressionPanel.querySelectorAll<HTMLElement>(`[data-rank-pips="${choice}"] i`);
      pips.forEach((pip, index) => pip.classList.toggle("filled", index < rank));
    }
    const weapon = progression.equipment("weapon");
    const armor = progression.equipment("armor");
    const charm = progression.equipment("charm");
    ui.weaponText.textContent = weapon.name;
    ui.armorText.textContent = armor.name;
    ui.charmText.textContent = charm.name;
    ui.powerText.textContent = String(progression.stats.strikeDamage);
    ui.armorStatText.textContent = String(progression.stats.armor);
    ui.healthStatText.textContent = String(progression.stats.maxHealth);
    ui.speedStatText.textContent = String(Math.round(progression.stats.moveSpeed));
    ui.aegisUnlockNode.classList.toggle("locked", !progression.ownsSkill("aegis-burst"));
    ui.aegisUnlockNode.classList.toggle("unlocked", progression.ownsSkill("aegis-burst"));
    ui.windUnlockNode.classList.toggle("locked", !progression.ownsSkill("wind-step"));
    ui.windUnlockNode.classList.toggle("unlocked", progression.ownsSkill("wind-step"));
    const slotIcon = { weapon: "⚔", armor: "◈", charm: "✧" } as const;
    ui.loadoutCards.innerHTML = (["weapon", "armor", "charm"] as const)
      .map((slot) => {
        const item = progression.equipment(slot);
        const stats = [
          item.attack ? `ATK +${item.attack}` : "",
          item.armor ? `ARM +${item.armor}` : "",
          item.vitality ? `VIT ${item.vitality > 0 ? "+" : ""}${item.vitality}` : "",
          item.agility ? `AGI ${item.agility > 0 ? "+" : ""}${item.agility}` : "",
        ].filter(Boolean).join(" · ");
        return `<div class="loadout-card"><span class="loadout-card-icon">${slotIcon[slot]}</span><div><small>${slot.toUpperCase()} · TIER ${item.tier}</small><strong>${item.name}</strong></div><span class="loadout-card-stats">${stats || "No modifiers"}</span></div>`;
      })
      .join("");
    ui.skill2Slot.classList.toggle("locked", !progression.ownsSkill("aegis-burst"));
    ui.skill3Slot.classList.toggle("locked", !progression.ownsSkill("wind-step"));
    const skill1Cd = progression.cooldown("crescent-arc");
    const skill2Cd = progression.cooldown("aegis-burst");
    const skill3Cd = progression.cooldown("wind-step");
    ui.skill1CooldownText.textContent = skill1Cd > 0 ? `${skill1Cd.toFixed(1)}S` : "READY";
    ui.skill2CooldownText.textContent = progression.ownsSkill("aegis-burst") ? (skill2Cd > 0 ? `${skill2Cd.toFixed(1)}S` : "READY") : "LOCKED";
    ui.skill3CooldownText.textContent = progression.ownsSkill("wind-step") ? (skill3Cd > 0 ? `${skill3Cd.toFixed(1)}S` : "READY") : "LOCKED";
    for (const button of Array.from(ui.progressionPanel.querySelectorAll<HTMLElement>("[data-inventory-filter]"))) {
      button.classList.toggle("active", button.dataset.inventoryFilter === inventoryFilter);
    }
    const inventoryIds = [...progression.inventory]
      .filter((id) => inventoryFilter === "all" || EQUIPMENT[id].slot === inventoryFilter)
      .sort((a, b) => EQUIPMENT[b].tier - EQUIPMENT[a].tier || EQUIPMENT[a].name.localeCompare(EQUIPMENT[b].name));
    if (selectedEquipment === null || !progression.inventory.has(selectedEquipment) || (inventoryFilter !== "all" && EQUIPMENT[selectedEquipment].slot !== inventoryFilter)) {
      selectedEquipment = inventoryIds[0] ?? null;
    }
    const itemIcon = { weapon: "⚔", armor: "◈", charm: "✧" } as const;
    ui.inventoryList.innerHTML = inventoryIds
      .map((id) => {
        const item = EQUIPMENT[id];
        const equipped = progression.profile.equipped(item.slot) === id;
        const selected = selectedEquipment === id;
        return `<button class="inventory-item${equipped ? " equipped" : ""}${selected ? " selected" : ""}" data-equipment="${id}" type="button"><span class="inventory-item-icon">${itemIcon[item.slot]}</span><strong>${item.name}</strong><small>${item.slot.toUpperCase()} · TIER ${item.tier}</small>${equipped ? '<span class="inventory-equipped-tag">EQUIPPED</span>' : ""}</button>`;
      })
      .join("");
    if (selectedEquipment) {
      const item = EQUIPMENT[selectedEquipment];
      const equipped = progression.profile.equipped(item.slot) === selectedEquipment;
      ui.itemDetailRarity.textContent = `TIER ${item.tier} · ${item.slot.toUpperCase()}`;
      ui.itemDetailIcon.textContent = itemIcon[item.slot];
      ui.itemDetailName.textContent = item.name;
      ui.itemDetailDescription.textContent = item.description;
      ui.itemDetailStats.innerHTML = [
        ["ATTACK", item.attack],
        ["ARMOR", item.armor],
        ["VITALITY", item.vitality],
        ["AGILITY", item.agility],
      ].map(([label, value]) => `<div class="item-stat"><span>${label}</span><strong>${Number(value) >= 0 ? "+" : ""}${value}</strong></div>`).join("");
      ui.itemEquipButton.disabled = equipped;
      ui.itemEquipButton.textContent = equipped ? "Equipped" : `Equip ${item.name}`;
    } else {
      ui.itemDetailRarity.textContent = "NO ITEM";
      ui.itemDetailIcon.textContent = "◇";
      ui.itemDetailName.textContent = "No equipment";
      ui.itemDetailDescription.textContent = "No equipment matches the selected filter.";
      ui.itemDetailStats.innerHTML = "";
      ui.itemEquipButton.disabled = true;
      ui.itemEquipButton.textContent = "Equip";
    }
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
        `Dropped ${droppedSteps}\n` +
        `Area    ${spawnStats.area.id}\n` +
        `Spawn   ${spawnStats.alive}/${spawnStats.targetAlive} alive · ${spawnStats.totalAllocated} allocated\n` +
        `Loot    ${loot.length}/${SPAWN_LIMITS.maxLoot}`;
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
      ? "The beacon is active. Greywood, Fenwatch, and the Broken Ruins are secure."
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
