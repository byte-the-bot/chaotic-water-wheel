export function hsvToRgb({ hue, saturation, value }) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = clamp01(saturation) * clamp01(value);
  const hueSector = normalizedHue / 60;
  const intermediate = chroma * (1 - Math.abs((hueSector % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSector < 1) {
    [red, green, blue] = [chroma, intermediate, 0];
  } else if (hueSector < 2) {
    [red, green, blue] = [intermediate, chroma, 0];
  } else if (hueSector < 3) {
    [red, green, blue] = [0, chroma, intermediate];
  } else if (hueSector < 4) {
    [red, green, blue] = [0, intermediate, chroma];
  } else if (hueSector < 5) {
    [red, green, blue] = [intermediate, 0, chroma];
  } else {
    [red, green, blue] = [chroma, 0, intermediate];
  }

  const offset = clamp01(value) - chroma;
  return {
    red: Math.round((red + offset) * 255),
    green: Math.round((green + offset) * 255),
    blue: Math.round((blue + offset) * 255),
  };
}

export function rgbToCss({ red, green, blue }, alpha = 1) {
  const alphaValue = Math.min(1, Math.max(0, alpha));
  return `rgb(${Math.round(red)} ${Math.round(green)} ${Math.round(blue)} / ${alphaValue.toFixed(3)})`;
}

export function rgbToHex({ red, green, blue }) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function colorFromCenterOfMass(center) {
  const hue = ((90 - (center.angle * 180) / Math.PI) % 360 + 360) % 360;
  const saturation = clamp01(center.normalizedRadius);
  const value = 0.55 + 0.45 * saturation;
  return {
    hue,
    saturation,
    value,
    rgb: hsvToRgb({ hue, saturation, value }),
  };
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
