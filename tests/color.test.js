import assert from "node:assert/strict";
import test from "node:test";
import { colorFromCenterOfMass, hsvToRgb, rgbToCss, rgbToHex } from "../src/color.js";

test("HSV conversion handles the primary and secondary colors", () => {
  assert.deepEqual(hsvToRgb({ hue: 0, saturation: 1, value: 1 }), { red: 255, green: 0, blue: 0 });
  assert.deepEqual(hsvToRgb({ hue: 120, saturation: 1, value: 1 }), { red: 0, green: 255, blue: 0 });
  assert.deepEqual(hsvToRgb({ hue: 240, saturation: 1, value: 1 }), { red: 0, green: 0, blue: 255 });
  assert.deepEqual(hsvToRgb({ hue: 60, saturation: 1, value: 1 }), { red: 255, green: 255, blue: 0 });
});

test("the center of mass maps angle and radius to HSV", () => {
  const topRed = colorFromCenterOfMass({ angle: Math.PI / 2, normalizedRadius: 1 });
  assert.equal(topRed.hue, 0);
  assert.equal(topRed.saturation, 1);
  assert.equal(topRed.value, 1);
  assert.deepEqual(topRed.rgb, { red: 255, green: 0, blue: 0 });

  const rightGreen = colorFromCenterOfMass({ angle: 0, normalizedRadius: 1 });
  assert.equal(rightGreen.hue, 90);
  assert.deepEqual(rightGreen.rgb, { red: 128, green: 255, blue: 0 });

  const dimGray = colorFromCenterOfMass({ angle: 42, normalizedRadius: 0 });
  assert.equal(dimGray.saturation, 0);
  assert.equal(dimGray.value, 0.55);
});

test("RGB serialization is deterministic", () => {
  assert.equal(rgbToCss({ red: 1, green: 2, blue: 3 }, 2), "rgb(1 2 3 / 1.000)");
  assert.equal(rgbToHex({ red: 255, green: 0, blue: 128 }), "#ff0080");
});
