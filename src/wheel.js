export const DEFAULT_WHEEL_PARAMETERS = Object.freeze({
  bucketCount: 16,
  inflowRate: 8,
  leakRate: 0.05,
  damping: 1,
  torqueScale: 6,
  bucketCapacity: 2.25,
  dt: 1 / 120,
});

const TWO_PI = 2 * Math.PI;
const TOP_ANGLE = -Math.PI / 2;

function randomDecimal() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

function normalizeAngle(angle) {
  const normalized = angle % TWO_PI;
  return normalized < 0 ? normalized + TWO_PI : normalized;
}

function angleDifference(left, right) {
  const difference = normalizeAngle(left - right);
  return difference > Math.PI ? difference - TWO_PI : difference;
}

export class WaterWheel {
  constructor({
    bucketCount = DEFAULT_WHEEL_PARAMETERS.bucketCount,
    inflowRate = DEFAULT_WHEEL_PARAMETERS.inflowRate,
    leakRate = DEFAULT_WHEEL_PARAMETERS.leakRate,
    damping = DEFAULT_WHEEL_PARAMETERS.damping,
    torqueScale = DEFAULT_WHEEL_PARAMETERS.torqueScale,
    bucketCapacity = DEFAULT_WHEEL_PARAMETERS.bucketCapacity,
    dt = DEFAULT_WHEEL_PARAMETERS.dt,
    seed = randomDecimal(),
  } = {}) {
    this.bucketCount = Math.max(3, Math.round(bucketCount));
    this.inflowRate = Math.max(0, inflowRate);
    this.leakRate = Math.max(0, leakRate);
    this.damping = Math.max(0, damping);
    this.torqueScale = Math.max(0, torqueScale);
    this.bucketCapacity = Math.max(0, bucketCapacity);
    this.dt = Math.min(1 / 30, Math.max(1 / 480, dt));
    this.seed = Math.min(0.999999, Math.max(0, seed));

    this.bucketAngles = new Float64Array(this.bucketCount);
    this.bucketVolumes = new Float64Array(this.bucketCount);
    this.angularVelocity = 0;
    this.time = 0;
    this.reset({ seed: this.seed });
  }

  reset({ seed = randomDecimal() } = {}) {
    this.seed = seed;
    this.bucketAngles.fill(0);
    this.bucketVolumes.fill(0);
    this.angularVelocity = (this.seed - 0.5) * 0.002;
    this.time = 0;

    for (let index = 0; index < this.bucketCount; index += 1) {
      this.bucketAngles[index] = TOP_ANGLE + (index * TWO_PI) / this.bucketCount;
    }

    const perturbationIndex = Math.floor(this.seed * this.bucketCount) % this.bucketCount;
    this.bucketVolumes[perturbationIndex] = 0.008 + this.seed * 0.004;
  }

  setBucketCount(nextCount) {
    const count = Math.max(3, Math.round(nextCount));
    if (count === this.bucketCount) return;

    const oldAngles = this.bucketAngles;
    const oldVolumes = this.bucketVolumes;
    this.bucketCount = count;
    this.bucketAngles = new Float64Array(count);
    this.bucketVolumes = new Float64Array(count);

    for (let index = 0; index < count; index += 1) {
      const source = Math.min(index, oldAngles.length - 1);
      this.bucketAngles[index] = TOP_ANGLE + (index * TWO_PI) / count;
      this.bucketVolumes[index] = oldVolumes[source] ?? 0;
    }
  }

  centerOfMass() {
    let x = 0;
    let y = 0;
    let mass = 0;

    for (let index = 0; index < this.bucketCount; index += 1) {
      const volume = this.bucketVolumes[index];
      const angle = this.bucketAngles[index];
      x += volume * Math.cos(angle);
      y += volume * Math.sin(angle);
      mass += volume;
    }

    return { x, y, mass, radius: Math.hypot(x, y), angle: Math.atan2(y, x) };
  }

  normalizedCenterOfMass() {
    const center = this.centerOfMass();
    if (center.mass === 0) {
      return { ...center, normalizedX: 0, normalizedY: 0, normalizedRadius: 0 };
    }

    return {
      ...center,
      normalizedX: center.x / center.mass,
      normalizedY: center.y / center.mass,
      normalizedRadius: center.radius / center.mass,
    };
  }

  step({ speed = 1 } = {}) {
    const dt = this.dt * Math.min(3, Math.max(0, speed));
    if (dt === 0) return;

    const inflowIndex = this.bucketNearestTo(TOP_ANGLE);
    this.bucketVolumes[inflowIndex] = Math.min(
      this.bucketCapacity,
      this.bucketVolumes[inflowIndex] + this.inflowRate * dt,
    );

    for (let index = 0; index < this.bucketCount; index += 1) {
      const volume = this.bucketVolumes[index];
      if (volume > 0) {
        this.bucketVolumes[index] = Math.max(0, volume - this.leakRate * volume * dt);
      }
    }

    let torque = 0;
    for (let index = 0; index < this.bucketCount; index += 1) {
      torque -= this.torqueScale * this.bucketVolumes[index] * Math.sin(this.bucketAngles[index]);
    }

    this.angularVelocity += (torque - this.damping * this.angularVelocity) * dt;
    this.angularVelocity = Math.max(-50, Math.min(50, this.angularVelocity));

    const rotation = this.angularVelocity * dt;
    for (let index = 0; index < this.bucketCount; index += 1) {
      this.bucketAngles[index] = normalizeAngle(this.bucketAngles[index] + rotation);
    }

    this.time += dt;
  }

  bucketNearestTo(targetAngle) {
    let nearest = 0;
    let nearestDifference = Infinity;

    for (let index = 0; index < this.bucketCount; index += 1) {
      const difference = Math.abs(angleDifference(this.bucketAngles[index], targetAngle));
      if (difference < nearestDifference) {
        nearest = index;
        nearestDifference = difference;
      }
    }

    return nearest;
  }
}
