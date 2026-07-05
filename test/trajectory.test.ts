import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceTrajectoryPosition,
  roundTrajectoryPosition,
  trajectoryDistance
} from "../src/core/trajectory";

test("trajectory follows slow continuous planner motion exactly", () => {
  const next = advanceTrajectoryPosition(
    { x: 0, y: 0 },
    { x: 0.72, y: 0 },
    16,
    { maxSpeedPxPerMs: 0.25 }
  );

  assert.deepEqual(next, { x: 0.72, y: 0 });
});

test("trajectory limits large jumps into smooth frame-sized steps", () => {
  const target = { x: 200, y: 80 };
  const first = advanceTrajectoryPosition({ x: 0, y: 0 }, target, 16, {
    maxSpeedPxPerMs: 0.25
  });
  const second = advanceTrajectoryPosition(first, target, 16, {
    maxSpeedPxPerMs: 0.25
  });

  assert.ok(trajectoryDistance(second, target) < trajectoryDistance(first, target));
  assert.ok(trajectoryDistance({ x: 0, y: 0 }, first) <= 4.001);
  assert.ok(trajectoryDistance(first, second) <= 4.001);
});

test("trajectory snaps when already visually close", () => {
  assert.deepEqual(
    advanceTrajectoryPosition(
      { x: 99.7, y: 100.2 },
      { x: 100, y: 100 },
      16,
      { snapDistance: 0.75 }
    ),
    { x: 100, y: 100 }
  );
});

test("rounded slow trajectory produces small steady pixel steps", () => {
  let position = { x: 0, y: 0 };
  const rounded = [];

  for (let frame = 1; frame <= 80; frame += 1) {
    position = advanceTrajectoryPosition(position, { x: frame * 0.72, y: 0 }, 16, {
      maxSpeedPxPerMs: 0.25
    });
    rounded.push(roundTrajectoryPosition(position).x);
  }

  const deltas = rounded.slice(1).map((value, index) => value - rounded[index]);
  assert.ok(deltas.every((delta) => delta === 0 || delta === 1));
  assert.ok(longestRepeatedRun(rounded) <= 2);
});

function longestRepeatedRun(values: number[]): number {
  return values.reduce(
    (state, value, index) => {
      const run = index > 0 && values[index - 1] === value ? state.current + 1 : 1;
      return {
        current: run,
        longest: Math.max(state.longest, run)
      };
    },
    { current: 0, longest: 0 }
  ).longest;
}
