import { WaterWheel } from "./wheel.js";
import { colorFromCenterOfMass, hsvToRgb, rgbToCss, rgbToHex } from "./color.js";

const wheelCanvas = document.querySelector("#wheel-canvas");
const hsvCanvas = document.querySelector("#hsv-canvas");
const contexts = new Map([
  [wheelCanvas, wheelCanvas.getContext("2d")],
  [hsvCanvas, hsvCanvas.getContext("2d")],
]);
const togglePlayButton = document.querySelector("#toggle-play");
const stepOnceButton = document.querySelector("#step-once");
const resetButton = document.querySelector("#reset");
const randomizeButton = document.querySelector("#randomize");
const controlsForm = document.querySelector("#controls");
const trailInput = document.querySelector("#trail-input");
const colorSwatch = document.querySelector("#color-swatch");
const liveStatus = document.querySelector("#live-status");
const outputs = new Map(
  [...document.querySelectorAll("output")].map((output) => [output.getAttribute("for"), output]),
);
const hsvBaseCanvas = document.createElement("canvas");
let hsvBaseKey = "";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wheel = new WaterWheel();
const state = {
  running: !reducedMotion,
  speed: 1,
  trailEnabled: true,
  trail: [],
  accumulator: 0,
  lastFrameTime: performance.now(),
  lastReadoutTime: 0,
  lastStatusTime: 0,
};

togglePlayButton.textContent = state.running ? "Pause" : "Play";

function resizeCanvas(canvas) {
  const rectangle = canvas.getBoundingClientRect();
  const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const width = Math.max(1, Math.round(rectangle.width * scale));
  const height = Math.max(1, Math.round(rectangle.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height };
}

function prepareCanvas(canvas) {
  const context = contexts.get(canvas);
  const { width, height } = resizeCanvas(canvas);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height, centerX: width / 2, centerY: height / 2 };
}

function drawWheel(center, color) {
  const { context, width, height, centerX, centerY } = prepareCanvas(wheelCanvas);
  const radius = Math.min(width, height) * 0.37;
  const bucketRadius = radius * 0.12;

  context.fillStyle = "#05080e";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "#ffffff12";
  context.lineWidth = 1;
  for (const guide of [0.33, 0.66, 1]) {
    context.beginPath();
    context.arc(centerX, centerY, radius * guide, 0, Math.PI * 2);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(centerX - radius, centerY);
  context.lineTo(centerX + radius, centerY);
  context.moveTo(centerX, centerY - radius);
  context.lineTo(centerX, centerY + radius);
  context.stroke();

  context.strokeStyle = "#6c7f99";
  context.lineWidth = Math.max(2, radius * 0.012);
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "#ffffff20";
  context.lineWidth = 1;
  for (let index = 0; index < wheel.bucketCount; index += 1) {
    const angle = wheel.bucketAngles[index];
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(centerX + Math.cos(angle) * radius, centerY - Math.sin(angle) * radius);
    context.stroke();
  }

  for (let index = 0; index < wheel.bucketCount; index += 1) {
    const angle = wheel.bucketAngles[index];
    const fill = Math.min(1, wheel.bucketVolumes[index] / wheel.bucketCapacity);
    const bucketX = centerX + Math.cos(angle) * radius;
    const bucketY = centerY - Math.sin(angle) * radius;

    context.beginPath();
    context.arc(bucketX, bucketY, bucketRadius, 0, Math.PI * 2);
    context.fillStyle = "#162132";
    context.fill();
    context.strokeStyle = "#7d90aa";
    context.lineWidth = Math.max(1, radius * 0.006);
    context.stroke();

    if (fill > 0) {
      context.beginPath();
      context.arc(bucketX, bucketY, bucketRadius * (0.25 + 0.65 * fill), 0, Math.PI * 2);
      context.fillStyle = rgbToCss({ red: 73, green: 176, blue: 255 }, 0.2 + 0.6 * fill);
      context.fill();
    }
  }

  context.fillStyle = "#9fb2ca";
  context.beginPath();
  context.moveTo(centerX - radius * 0.14, 0);
  context.lineTo(centerX + radius * 0.14, 0);
  context.lineTo(centerX, height * 0.045);
  context.closePath();
  context.fill();

  if (state.trailEnabled && state.trail.length > 1) {
    for (let index = 1; index < state.trail.length; index += 1) {
      const previous = state.trail[index - 1];
      const current = state.trail[index];
      const alpha = (index / state.trail.length) * 0.75;
      context.strokeStyle = rgbToCss(color.rgb, alpha);
      context.lineWidth = Math.max(1, radius * 0.006);
      context.beginPath();
      context.moveTo(centerX + previous.x * radius, centerY - previous.y * radius);
      context.lineTo(centerX + current.x * radius, centerY - current.y * radius);
      context.stroke();
    }
  }

  const comX = centerX + center.normalizedX * radius;
  const comY = centerY - center.normalizedY * radius;
  context.beginPath();
  context.arc(comX, comY, radius * 0.075, 0, Math.PI * 2);
  context.fillStyle = "#ff8a3d";
  context.shadowColor = "#ff8a3d";
  context.shadowBlur = radius * 0.08;
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = "#fff";
  context.lineWidth = Math.max(1, radius * 0.01);
  context.stroke();
}

function drawHsvWheel(center, color) {
  const { context, width, height, centerX, centerY } = prepareCanvas(hsvCanvas);
  const radius = Math.min(width, height) * 0.42;
  const baseKey = `${width}x${height}`;
  if (hsvBaseKey !== baseKey) {
    hsvBaseCanvas.width = width;
    hsvBaseCanvas.height = height;
    const baseContext = hsvBaseCanvas.getContext("2d");
    drawHsvBase(baseContext, centerX, centerY, radius);
    hsvBaseKey = baseKey;
  }

  context.drawImage(hsvBaseCanvas, 0, 0);

  const markerRadius = radius * Math.max(0.055, color.saturation);
  const markerX = centerX + Math.cos((color.hue * Math.PI) / 180) * markerRadius;
  const markerY = centerY - Math.sin((color.hue * Math.PI) / 180) * markerRadius;
  const markerSize = Math.max(5, radius * 0.055);
  context.beginPath();
  context.arc(markerX, markerY, markerSize, 0, Math.PI * 2);
  context.fillStyle = rgbToCss(color.rgb);
  context.fill();
  context.strokeStyle = "#fff";
  context.lineWidth = Math.max(1.5, radius * 0.008);
  context.stroke();
}

function drawHsvBase(context, centerX, centerY, radius) {
  const hueGradient = context.createConicGradient(0, centerX, centerY);
  for (let angle = 0; angle <= 360; angle += 30) {
    hueGradient.addColorStop(angle / 360, rgbToCss(hsvToRgb({ hue: angle, saturation: 1, value: 1 })));
  }

  context.fillStyle = hueGradient;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  const saturationGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  saturationGradient.addColorStop(0, "#fff");
  saturationGradient.addColorStop(1, "#ffffff00");
  context.fillStyle = saturationGradient;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#ffffff30";
  context.lineWidth = 1;
  for (const guide of [0.25, 0.5, 0.75]) {
    context.beginPath();
    context.arc(centerX, centerY, radius * guide, 0, Math.PI * 2);
    context.stroke();
  }
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function updateReadouts(center, color, now) {
  colorSwatch.style.backgroundColor = rgbToCss(color.rgb);

  if (now - state.lastReadoutTime < 250) return;
  state.lastReadoutTime = now;
  document.querySelector("#hue-value").textContent = `${color.hue.toFixed(1)}°`;
  document.querySelector("#saturation-value").textContent = formatPercent(color.saturation);
  document.querySelector("#brightness-value").textContent = formatPercent(color.value);
  document.querySelector("#hex-value").textContent = rgbToHex(color.rgb);
  document.querySelector("#velocity-value").textContent = `${wheel.angularVelocity.toFixed(3)} rad/s`;
  document.querySelector("#water-value").textContent = `${center.mass.toFixed(3)} units`;

  if (now - state.lastStatusTime >= 1000) {
    state.lastStatusTime = now;
    liveStatus.textContent = `${state.running ? "Running" : "Paused"}; hue ${Math.round(color.hue)} degrees, saturation ${formatPercent(color.saturation)}.`;
  }
}

function recordTrail(center) {
  state.trail.push({ x: center.normalizedX, y: center.normalizedY });
  if (state.trail.length > 480) state.trail.shift();
}

function render(now = performance.now()) {
  const center = wheel.normalizedCenterOfMass();
  const color = colorFromCenterOfMass(center);
  drawWheel(center, color);
  drawHsvWheel(center, color);
  updateReadouts(center, color, now);
}

function simulationStep() {
  wheel.step();
  recordTrail(wheel.normalizedCenterOfMass());
}

function frame(now) {
  const elapsed = Math.min(0.25, Math.max(0, (now - state.lastFrameTime) / 1000));
  state.lastFrameTime = now;
  state.accumulator += elapsed * state.speed;

  let steps = 0;
  while (state.accumulator >= wheel.dt && steps < 8) {
    if (state.running) simulationStep();
    state.accumulator -= wheel.dt;
    steps += 1;
  }
  if (steps === 8) state.accumulator = 0;

  render(now);
  requestAnimationFrame(frame);
}

function updatePlayButton() {
  togglePlayButton.textContent = state.running ? "Pause" : "Play";
}

function togglePlay() {
  state.running = !state.running;
  state.lastFrameTime = performance.now();
  updatePlayButton();
}

function resetSimulation() {
  wheel.reset();
  state.trail.length = 0;
  state.accumulator = 0;
  render();
}

function randomizeParameters() {
  const nextBucketCount = 10 + Math.floor(Math.random() * 23);
  const parameters = {
    inflowRate: 3 + Math.random() * 5,
    leakRate: 0.02 + Math.random() * 0.1,
    damping: 0.65 + Math.random() * 0.6,
    torqueScale: 4 + Math.random() * 3.5,
  };
  Object.assign(wheel, parameters);
  wheel.setBucketCount(nextBucketCount);
  controlsForm.bucketCount.value = nextBucketCount;
  controlsForm.inflowRate.value = parameters.inflowRate;
  controlsForm.leakRate.value = parameters.leakRate;
  controlsForm.damping.value = parameters.damping;
  controlsForm.torqueScale.value = parameters.torqueScale;
  updateControlOutputs();
  resetSimulation();
}

function updateControlOutputs() {
  outputs.get("bucket-input").value = controlsForm.bucketCount.value;
  outputs.get("inflow-input").value = Number(controlsForm.inflowRate.value).toFixed(2);
  outputs.get("leak-input").value = Number(controlsForm.leakRate.value).toFixed(2);
  outputs.get("damping-input").value = Number(controlsForm.damping.value).toFixed(2);
  outputs.get("torque-input").value = Number(controlsForm.torqueScale.value).toFixed(2);
  outputs.get("speed-input").value = `${Number(controlsForm.speed.value).toFixed(2)}×`;
}

controlsForm.addEventListener("input", (event) => {
  const { name, value } = event.target;
  if (name === "bucketCount") {
    wheel.setBucketCount(Number(value));
  } else if (name === "speed") {
    state.speed = Number(value);
  } else if (name) {
    wheel[name] = Number(value);
  }
  updateControlOutputs();
});

trailInput.addEventListener("change", () => {
  state.trailEnabled = trailInput.checked;
});

togglePlayButton.addEventListener("click", togglePlay);
stepOnceButton.addEventListener("click", () => {
  state.running = false;
  updatePlayButton();
  simulationStep();
  render();
});
resetButton.addEventListener("click", resetSimulation);
randomizeButton.addEventListener("click", randomizeParameters);

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.code === "Space" || event.key.toLowerCase() === "k") {
    event.preventDefault();
    togglePlay();
  } else if (event.key.toLowerCase() === "r") {
    resetSimulation();
  } else if (event.key.toLowerCase() === "s") {
    state.running = false;
    updatePlayButton();
    simulationStep();
    render();
  } else if (event.key.toLowerCase() === "t") {
    trailInput.checked = !trailInput.checked;
    state.trailEnabled = trailInput.checked;
  }
});

window.addEventListener("resize", render);
updateControlOutputs();
render();
requestAnimationFrame(frame);
