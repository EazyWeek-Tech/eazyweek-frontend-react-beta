import React from 'react';

const FaceMapperReadOnly = ({ zones }) => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = '/images/facediagram.jpg';

    img.onload = () => {
      const canvasWidth = 400;
      const canvasHeight = 400;
      const imageWidth = 400;
      const imageHeight = 400;

      const imageX = (canvasWidth - imageWidth) / 2;
      const imageY = (canvasHeight - imageHeight) / 2;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw the image centered
      ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight);

      // Draw zones
      zones.forEach((zone) => {
        const { type, coordinates = [], label } = zone;
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'red';
        ctx.lineWidth = 2;

        if (type === 'point' && coordinates.length === 2) {
          const [x, y] = coordinates;
          const drawX = x + imageX;
          const drawY = y + imageY;

          ctx.beginPath();
          ctx.arc(drawX, drawY, 4, 0, 2 * Math.PI);
          ctx.fill();

          if (label) {
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.fillText(label, drawX + 6, drawY - 6);
          }
        }

        else if ((type === 'pen' || type === 'line') && coordinates.length >= 4) {
          ctx.beginPath();
          for (let i = 0; i < coordinates.length - 2; i += 2) {
            const [x1, y1] = [coordinates[i] + imageX, coordinates[i + 1] + imageY];
            const [x2, y2] = [coordinates[i + 2] + imageX, coordinates[i + 3] + imageY];
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
          ctx.stroke();

          if (label) {
            const [lx, ly] = [coordinates[0] + imageX, coordinates[1] + imageY];
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.fillText(label, lx + 6, ly - 6);
          }
        }
      });
    };
  }, [zones]);

  return (
    <div className="readonly-face-mapper">
      <canvas ref={canvasRef} style={{ border: '1px solid #ccc', maxWidth: '100%' }} />
    </div>
  );
};

export default FaceMapperReadOnly;
