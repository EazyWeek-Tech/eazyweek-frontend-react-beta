import React, { useRef, useEffect } from "react";

const FaceMapperReadOnly = ({ zones = [], width, height, backgroundImageUrl }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundImageUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawZones(ctx, zones, canvas.width, canvas.height);
      };
      img.src = backgroundImageUrl;
    } else {
      drawZones(ctx, zones, canvas.width, canvas.height);
    }
  }, [zones, backgroundImageUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: "1px solid #ccc", maxWidth: "100%" }}
    />
  );
};

export default FaceMapperReadOnly;

function drawZones(ctx, zones, canvasW, canvasH) {
  zones.forEach((z) => {
    switch (z.type) {
      case "point":
        drawPoint(ctx, z, canvasW, canvasH);
        break;
      case "line":
      case "pen":
        drawPath(ctx, z, canvasW, canvasH);
        break;
      default:
        break;
    }
  });
}

function drawPoint(ctx, z, canvasW, canvasH) {
  const [x, y] = scaleCoords(z.coordinates, z.canvasWidth, z.canvasHeight, canvasW, canvasH);
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ff0000";
  ctx.fill();

  if (z.label) {
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#000";
    ctx.fillText(z.label, x + 6, y - 6);
  }
}

function drawPath(ctx, z, canvasW, canvasH) {
  const coords = z.coordinates;
  if (!coords || coords.length < 4) return;

  const pairs = [];
  for (let i = 0; i < coords.length; i += 2) {
    const [x, y] = scaleCoords([coords[i], coords[i + 1]], z.canvasWidth, z.canvasHeight, canvasW, canvasH);
    pairs.push([x, y]);
  }

  ctx.beginPath();
  ctx.moveTo(pairs[0][0], pairs[0][1]);
  for (let i = 1; i < pairs.length; i++) {
    ctx.lineTo(pairs[i][0], pairs[i][1]);
  }
  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (z.label) {
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#000";
    ctx.fillText(z.label, pairs[0][0] + 6, pairs[0][1] - 6);
  }
}

function scaleCoords([x, y], savedW, savedH, nowW, nowH) {
  if (!savedW || !savedH) return [x, y]; // assume same size
  const sx = nowW / savedW;
  const sy = nowH / savedH;
  return [x * sx, y * sy];
}
