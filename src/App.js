import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';

import './App.css';

function App() {
  const [dots, setDots] = useState([]);
  const [imageSrc, setImageSrc] = useState('');
  const [imageName, setImageName] = useState('');
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const magnifierRef = useRef(null);
  const dotSize = 8;

  const handleImageClick = (event) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = ((event.clientX - rect.left) * (canvas.width / rect.width)) | 0;
    const y = ((event.clientY - rect.top) * (canvas.height / rect.height)) | 0;

    const newDot = { x, y, color: getDotColor() };
    setDots((prevDots) => [...prevDots, newDot]);
  };

  const handleReset = () => {
    setDots([]);
  };

  const handleUndo = () => {
    if (dots.length > 0) {
      setDots((prevDots) => prevDots.slice(0, -1));
    }
  };

  const saveImage = () => {
    const container = document.getElementById('combined-container');
    const count = dots.length;

    // Create a new canvas element for the combined image with the count
    const combinedCanvas = document.createElement('canvas');
    const containerWidth = container.scrollWidth;
    const containerHeight = container.scrollHeight;
    combinedCanvas.width = containerWidth;
    combinedCanvas.height = containerHeight;
    const ctx = combinedCanvas.getContext('2d');

    // Draw the main container (image and dots) on the new canvas
    html2canvas(container, { width: containerWidth, height: containerHeight }).then((mainCanvas) => {
      ctx.drawImage(mainCanvas, 0, 0, containerWidth, containerHeight);

      // Add the count in the top-right corner
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.font = '24px "Inter", Arial';
      const countText = `Count: ${count}`;
      const textMetrics = ctx.measureText(countText);
      const textWidth = textMetrics.width;
      const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
      const margin = 10;
      const boxWidth = textWidth + margin * 2;
      const boxHeight = textHeight + margin * 2;

      const textX = combinedCanvas.width - boxWidth - margin + margin;
      const textY = margin + textHeight + margin;

      ctx.beginPath();
      ctx.rect(combinedCanvas.width - boxWidth - margin, margin, boxWidth, boxHeight);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'black';
      ctx.fillText(countText, textX, textY);

      // Convert the combined canvas to a data URL (JPG format)
      const dataURL = combinedCanvas.toDataURL('image/jpg');

      // Create a link element to download the image
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = imageName.split('.')[0] + '_out.jpg';

      // Trigger a click event on the link to initiate the download
      link.click();
    });
  };


  const handleSave = () => {
    const json = JSON.stringify(dots);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = imageName.split('.')[0] + '.json';
    link.click();
  };

  const handleLoad = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const json = e.target.result;
      const parsedDots = JSON.parse(json);
      setDots(parsedDots);
    };

    reader.readAsText(file);
  };

  const handleContextmenu = useCallback((event) => {
    const canvas = canvasRef.current;
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    const dotToRemove = dots.find((dot) => {
      return (
        x >= dot.x - dotSize / 2 &&
        x <= dot.x + dotSize / 2 &&
        y >= dot.y - dotSize / 2 &&
        y <= dot.y + dotSize / 2
      );
    });

    if (dotToRemove) {
      setDots((prevDots) => prevDots.filter((dot) => dot !== dotToRemove));
    }
  }, [dots]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0, image.width, image.height);

      dots.forEach((dot) => {
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize / 2, 0, 2 * Math.PI);
        ctx.fill();
      });

      canvas.addEventListener('contextmenu', handleContextmenu);
    };

    return () => {
      // Cleanup: Remove the contextmenu event listener
      canvas.removeEventListener('contextmenu', handleContextmenu);
    };
  }, [dots, imageSrc, handleContextmenu]);

  const handleOpenImage = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };

    setImageName(file.name);
    reader.readAsDataURL(file);
  };

  const getDotColor = () => {
    const colorIndex = Math.floor(dots.length / 10) % 5;
    const colors = ['red', 'green', 'blue', 'yellow', 'magenta'];
    return colors[colorIndex];
  };

  const handleKeyDown = (event) => {
    if (event.key === 'z') {
      setIsMagnifierActive((prev) => !prev);
    }
  };

  const handleMouseMove = useCallback((event) => {
    if (!isMagnifierActive) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const magnifierRadius = 150;
    const magnifierDiameter = magnifierRadius * 2;

    const magnifier = magnifierRef.current;
    const magnifierCtx = magnifier.getContext('2d');

    const magnifierX = Math.min(
      Math.max(x - magnifierRadius, 0),
      canvas.width - magnifierDiameter
    );
    const magnifierY = Math.min(
      Math.max(y - magnifierRadius, 0),
      canvas.height - magnifierDiameter
    );

    const magnifierImage = new Image();
    magnifierImage.src = imageSrc;

    magnifierImage.onload = () => {
      magnifierCtx.clearRect(0, 0, magnifier.width, magnifier.height);
      magnifierCtx.drawImage(
        magnifierImage,
        magnifierX * 2,
        magnifierY * 2,
        magnifierDiameter * 2,
        magnifierDiameter * 2,
        0,
        0,
        magnifier.width,
        magnifier.height
      );

      const magnifiedDots = dots.filter((dot) => {
        return (
          dot.x >= magnifierX &&
          dot.x <= magnifierX + magnifierDiameter &&
          dot.y >= magnifierY &&
          dot.y <= magnifierY + magnifierDiameter
        );
      });

      magnifiedDots.forEach((dot) => {
        const dotX = dot.x - magnifierX + magnifierRadius;
        const dotY = dot.y - magnifierY + magnifierRadius;

        magnifierCtx.fillStyle = dot.color;
        magnifierCtx.beginPath();
        magnifierCtx.arc(dotX, dotY, dotSize / 2, 0, 2 * Math.PI);
        magnifierCtx.fill();
      });

      setMagnifierPosition({ x: magnifierX, y: magnifierY });
    };
  }, [dots, imageSrc, isMagnifierActive]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <div className="app-container">
      <h2>Muggenteller</h2>
      <div className="button-container">
        <button onClick={handleReset}>Reset</button>
        <button onClick={handleUndo} disabled={dots.length === 0}>
          Undo
        </button>
        <button onClick={handleSave}>Save Dots</button>
        <label htmlFor="load-input" className="custom-file-upload">
          Load Dots
          <input
            type="file"
            id="load-input"
            accept=".json"
            onChange={handleLoad}
          />
        </label>
      </div>
      <div className="button-container">
        <label htmlFor="image-input" className="custom-file-upload">
          Load Image
          <input
            type="file"
            id="image-input"
            accept=".jpg, .jpeg, .png"
            onChange={handleOpenImage}
          />
        </label>
        <button onClick={saveImage}>Save Image</button>
      </div>
      <p className="counter">Counter: {dots.length}</p>

      <div className="canvas-container" id="combined-container">
        <canvas
          ref={canvasRef}
          className="canvas"
          onClick={handleImageClick}
          onContextMenu={(e) => e.preventDefault()}
        ></canvas>
        {isMagnifierActive && (
          <canvas
            ref={magnifierRef}
            className="magnifier"
            width="300"
            height="300"
            style={{
              top: magnifierPosition.y,
              left: magnifierPosition.x,
            }}
          ></canvas>
        )}
      </div>
    </div>
  );
}

export default App;
