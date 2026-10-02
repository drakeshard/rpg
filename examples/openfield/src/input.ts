import {
  ActionBindingResolver,
  InputContextRouter,
  MonotonicInputSequence,
  TickInputHandoff,
  type LogicalActionId,
  type PhysicalInputEvent,
} from "@drakeshard/foundation/input";
import {
  BrowserInputLifecycle,
  KeyboardBrowserAdapter,
  PointerBrowserAdapter,
} from "@drakeshard/foundation/input/browser";

const ACTIONS = [
  "move-up",
  "move-down",
  "move-left",
  "move-right",
  "sprint",
  "attack",
  "dash",
  "interact",
  "potion",
  "restart",
  "debug",
  "skill-1",
  "skill-2",
  "skill-3",
  "progression",
] as const satisfies readonly LogicalActionId[];

type SampleAction = (typeof ACTIONS)[number];

export interface InputActions {
  attack: boolean;
  dash: boolean;
  interact: boolean;
  potion: boolean;
  restart: boolean;
  debug: boolean;
  skill1: boolean;
  skill2: boolean;
  skill3: boolean;
  progression: boolean;
  zoom: number;
}

export interface InputTick {
  held: ReadonlySet<SampleAction>;
  actions: InputActions;
}

export function bindInput(
  canvas: HTMLCanvasElement,
  startButton: HTMLElement,
  restartButton: HTMLElement,
  onGesture: () => void,
) {
  const sequence = new MonotonicInputSequence();
  const bindings = new ActionBindingResolver([
    { action: "move-up", binding: { kind: "key", code: "KeyW" } },
    { action: "move-up", binding: { kind: "key", code: "ArrowUp" } },
    { action: "move-down", binding: { kind: "key", code: "KeyS" } },
    { action: "move-down", binding: { kind: "key", code: "ArrowDown" } },
    { action: "move-left", binding: { kind: "key", code: "KeyA" } },
    { action: "move-left", binding: { kind: "key", code: "ArrowLeft" } },
    { action: "move-right", binding: { kind: "key", code: "KeyD" } },
    { action: "move-right", binding: { kind: "key", code: "ArrowRight" } },
    { action: "sprint", binding: { kind: "key", code: "ShiftLeft" } },
    { action: "sprint", binding: { kind: "key", code: "ShiftRight" } },
    { action: "attack", binding: { kind: "key", code: "Space" } },
    { action: "attack", binding: { kind: "pointer-button", button: 0, pointerType: "mouse" } },
    { action: "attack", binding: { kind: "pointer-button", button: 0, pointerType: "pen" } },
    { action: "attack", binding: { kind: "pointer-button", button: 0, pointerType: "touch" } },
    { action: "dash", binding: { kind: "key", code: "KeyQ" } },
    { action: "interact", binding: { kind: "key", code: "KeyE" } },
    { action: "potion", binding: { kind: "key", code: "KeyH" } },
    { action: "restart", binding: { kind: "key", code: "KeyR" } },
    { action: "debug", binding: { kind: "key", code: "F3" } },
    { action: "skill-1", binding: { kind: "key", code: "Digit1" } },
    { action: "skill-2", binding: { kind: "key", code: "Digit2" } },
    { action: "skill-3", binding: { kind: "key", code: "Digit3" } },
    { action: "progression", binding: { kind: "key", code: "KeyK" } },
  ]);
  const contexts = new InputContextRouter([
    {
      id: "gameplay",
      priority: 0,
      actions: ACTIONS.map((action) => ({ action })),
    },
  ]);
  contexts.activate("gameplay");
  const handoff = new TickInputHandoff({ actions: bindings, contexts });

  let zoom = 0;
  let uiRestart = false;
  const sink = (event: PhysicalInputEvent) => {
    if (event.kind === "wheel") zoom += Math.sign(event.deltaY);
    if (
      (event.kind === "key" || event.kind === "pointer-button") &&
      event.phase === "pressed"
    ) {
      onGesture();
    }
    handoff.ingest(event);
  };

  const lifecycle = new BrowserInputLifecycle({
    focusTarget: window,
    visibilityTarget: document,
    sequence,
    sink,
  });
  const keyboard = new KeyboardBrowserAdapter({
    keyboardTarget: window,
    lifecycle,
    sequence,
    sink,
  });
  const pointer = new PointerBrowserAdapter({
    pointerTarget: canvas,
    wheelTarget: canvas,
    lifecycle,
    sequence,
    sink,
  });

  const preventGameplayDefault = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "F3"].includes(event.code)) {
      event.preventDefault();
    }
  };
  const preventWheelDefault = (event: WheelEvent) => event.preventDefault();
  window.addEventListener("keydown", preventGameplayDefault, { passive: false });
  canvas.addEventListener("wheel", preventWheelDefault, { passive: false });
  startButton.addEventListener("click", () => {
    onGesture();
    uiRestart = true;
  });
  restartButton.addEventListener("click", () => {
    onGesture();
    uiRestart = true;
  });

  lifecycle.attach();
  keyboard.attach();
  pointer.attach();

  return {
    consumeTick(): InputTick {
      const snapshot = handoff.consumeTick();
      const held = new Set<SampleAction>();
      const pressed = new Set<SampleAction>();
      const uiHasFocus =
        document.activeElement instanceof HTMLElement &&
        document.activeElement.closest(".audio-panel, .audio-toggle") !== null;

      if (!uiHasFocus) {
        for (const action of snapshot.actions) {
          if (action.context !== "gameplay") continue;
          if (action.held) held.add(action.action as SampleAction);
          if (action.pressed) pressed.add(action.action as SampleAction);
        }
      }

      const actions: InputActions = {
        attack: pressed.has("attack"),
        dash: pressed.has("dash"),
        interact: pressed.has("interact"),
        potion: pressed.has("potion"),
        restart: pressed.has("restart") || uiRestart,
        debug: pressed.has("debug"),
        skill1: pressed.has("skill-1"),
        skill2: pressed.has("skill-2"),
        skill3: pressed.has("skill-3"),
        progression: pressed.has("progression"),
        zoom,
      };
      zoom = 0;
      uiRestart = false;
      return { held, actions };
    },
    dispose(): void {
      keyboard.detach();
      pointer.detach();
      lifecycle.detach();
      window.removeEventListener("keydown", preventGameplayDefault);
      canvas.removeEventListener("wheel", preventWheelDefault);
    },
  };
}
