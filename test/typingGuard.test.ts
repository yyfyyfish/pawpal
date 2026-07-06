import assert from "node:assert/strict";
import test from "node:test";
import {
  TYPING_GUARD_TTL_MS,
  createTypingAvoidanceZone,
  isAvoidanceZoneActive,
  chooseTypingCompanionSpot,
  petRectOverlapsAvoidanceZones
} from "../src/core/typingGuard";

test("typing bounds become padded privacy-safe avoidance zones", () => {
  const zone = createTypingAvoidanceZone(
    {
      x: 240,
      y: 320,
      width: 320,
      height: 80,
      source: "focused-element",
      appName: "Terminal",
      role: "AXTextArea"
    },
    { nowMs: 1_000, petSize: 96 }
  );

  assert.deepEqual(zone, {
    id: "typing:Terminal:focused-element",
    reason: "typing",
    source: "focused-element",
    x: 192,
    y: 272,
    width: 416,
    height: 176,
    activeUntilMs: 1_000 + TYPING_GUARD_TTL_MS
  });
  assert.equal("text" in zone!, false);
});

test("caret-sized bounds expand to a useful protected area", () => {
  const zone = createTypingAvoidanceZone(
    {
      x: 500,
      y: 420,
      width: 2,
      height: 18,
      source: "caret"
    },
    { nowMs: 2_000, petSize: 96 }
  );

  assert.equal(zone?.x, 371);
  assert.equal(zone?.y, 349);
  assert.equal(zone?.width, 260);
  assert.equal(zone?.height, 160);
});

test("avoidance zones expire and reject invalid typing geometry", () => {
  const zone = createTypingAvoidanceZone(
    {
      x: 0,
      y: 0,
      width: 240,
      height: 80,
      source: "focused-element"
    },
    { nowMs: 1_000, petSize: 96 }
  );

  assert.equal(isAvoidanceZoneActive(zone!, 3_499), true);
  assert.equal(isAvoidanceZoneActive(zone!, 3_500), false);
  assert.equal(
    createTypingAvoidanceZone(
      { x: 0, y: 0, width: 0, height: 80, source: "focused-element" },
      { nowMs: 1_000, petSize: 96 }
    ),
    null
  );
});

test("pet overlap checks ignore expired avoidance zones", () => {
  const zone = createTypingAvoidanceZone(
    {
      x: 240,
      y: 320,
      width: 320,
      height: 80,
      source: "focused-element"
    },
    { nowMs: 1_000, petSize: 96 }
  )!;

  assert.equal(
    petRectOverlapsAvoidanceZones({ x: 300, y: 300 }, 96, [zone], 1_200),
    true
  );
  assert.equal(
    petRectOverlapsAvoidanceZones({ x: 20, y: 20 }, 96, [zone], 1_200),
    false
  );
  assert.equal(
    petRectOverlapsAvoidanceZones({ x: 300, y: 300 }, 96, [zone], 4_000),
    false
  );
});

test("typing companion spot stays nearby without covering text", () => {
  const zone = createTypingAvoidanceZone(
    {
      x: 300,
      y: 260,
      width: 220,
      height: 180,
      source: "focused-element",
      appName: "Terminal"
    },
    { nowMs: 10_000, petSize: 96 }
  )!;
  const spot = chooseTypingCompanionSpot(
    zone,
    { x: 320, y: 300, width: 760, height: 520 },
    96
  );

  assert.ok(spot);
  assert.equal(petRectOverlapsAvoidanceZones(spot!, 96, [zone], 10_100), false);
  assert.ok(Math.abs(spot!.x - zone.x) <= 180 || Math.abs(spot!.y - zone.y) <= 180);
});
