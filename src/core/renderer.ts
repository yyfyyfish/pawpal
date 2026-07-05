import type { PetState } from "./types";

export function createSpriteRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  return {
    draw(state: PetState) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawPlaceholderCat(context, canvas, state);
    }
  };
}

function drawPlaceholderCat(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: PetState
) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 + 12;
  const bob = Math.sin(state.elapsedInStateMs / 300) * 2;
  const sleeping = state.behavior === "sleep";

  context.save();
  context.translate(centerX, centerY + bob);
  if (state.facing === "left") context.scale(-1, 1);

  context.fillStyle = "#2f3136";
  context.beginPath();
  context.ellipse(0, 12, 42, sleeping ? 24 : 30, 0, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.arc(28, -18, 26, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.moveTo(12, -38);
  context.lineTo(22, -66);
  context.lineTo(32, -38);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(34, -38);
  context.lineTo(48, -62);
  context.lineTo(52, -30);
  context.closePath();
  context.fill();

  context.strokeStyle = "#2f3136";
  context.lineWidth = 9;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-34, 16);
  context.quadraticCurveTo(-72, -12, -42, -34);
  context.stroke();

  context.fillStyle = "#f8d7da";
  context.beginPath();
  context.arc(38, -10, 3, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ffffff";
  if (sleeping) {
    context.strokeStyle = "#ffffff";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(16, -20);
    context.lineTo(26, -18);
    context.moveTo(42, -18);
    context.lineTo(52, -20);
    context.stroke();
  } else {
    context.beginPath();
    context.arc(20, -22, 3, 0, Math.PI * 2);
    context.arc(46, -22, 3, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}
