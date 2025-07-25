import React, { useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";

const SignaturePadReadOnly = ({
  base64,
  width = 400,
  height = 150,
  lineWidth = 2,
  background = "#fff",
  border = "1px solid #ccc",
  style = {},
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !base64) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(width / img.width, height / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const offsetX = (width - drawW) / 2;
      const offsetY = (height - drawH) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    };
    img.src = base64.startsWith("http") || base64.startsWith("/")
      ? `${API_BASE_URL}${base64}`
      : `data:image/png;base64,${base64}`;
  }, [base64, width, height, background]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border, display: "block", ...style }}
    />
  );
};

export default SignaturePadReadOnly;
