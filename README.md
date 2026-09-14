# Chaotic Water Wheel

A browser simulation of a chaotic leaky water wheel. Water enters the bucket
nearest the fixed top of the wheel, every bucket leaks proportionally to its
volume, and the imbalance creates torque. The wheel's center of mass traces a
projection of the Lorenz attractor.

The center of mass also drives an HSV color:

- hue is its clockwise angle from the top of the wheel,
- saturation is its normalized distance from the center,
- brightness rises from 55% at the center to 100% at the rim.

The app is dependency-free static JavaScript. Run `npm test` for the physics
and color tests.

## Controls

- **Play/Pause** (`Space`): toggle the simulation.
- **Reset** (`R`): restart with a new small perturbation.
- **Buckets**: number of buckets around the wheel.
- **Inflow**: water added at the fixed top.
- **Leak**: proportional outflow from every bucket.
- **Damping**: rotational friction.
- **Torque**: gravitational coupling strength.
- **Speed**: simulation time multiplier without changing the integration step.

Source inspiration: [James Munns](https://bsky.app/profile/jamesmunns.com/post/3mvgiq7pcss2r),
quoting [Matt Henderson's leaky water wheel video](https://bsky.app/profile/matthen.com/post/3mvg57cbsuc23).
