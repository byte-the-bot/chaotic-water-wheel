import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_WHEEL_PARAMETERS, WaterWheel } from "../src/wheel.js";

test("a symmetric wheel has its center of mass at the origin", () => {
  const wheel = new WaterWheel({ ...DEFAULT_WHEEL_PARAMETERS, bucketCount: 8, seed: 0.5 });
  wheel.bucketVolumes.fill(1);
  const center = wheel.normalizedCenterOfMass();
  assert.ok(Math.abs(center.normalizedX) < 1e-12);
  assert.ok(Math.abs(center.normalizedY) < 1e-12);
  assert.ok(center.normalizedRadius < 1e-12);
});

test("the default model is finite and produces reversals", () => {
  const wheel = new WaterWheel({ seed: 0.234567 });
  let reversals = 0;
  let previousSign = Math.sign(wheel.angularVelocity);

  for (let step = 0; step < 120 * 120; step += 1) {
    wheel.step();
    const sign = Math.sign(wheel.angularVelocity);
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) reversals += 1;
    if (sign !== 0) previousSign = sign;
    assert.ok(Number.isFinite(wheel.angularVelocity));
    assert.ok(Number.isFinite(wheel.time));
  }

  assert.ok(reversals >= 2, `expected reversals, got ${reversals}`);
});

test("step is deterministic for a fixed seed", () => {
  const run = () => {
    const wheel = new WaterWheel({ seed: 0.91 });
    for (let index = 0; index < 500; index += 1) wheel.step();
    return { angle: wheel.bucketAngles[0], velocity: wheel.angularVelocity, time: wheel.time };
  };

  assert.deepEqual(run(), run());
});
