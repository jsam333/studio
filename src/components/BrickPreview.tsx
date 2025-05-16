import React from 'react';
import { Brick } from '../interfaces';

interface BrickPreviewProps {
  bricks: Brick[][];
  previewWidth?: number;
  previewHeight?: number;
}

const BrickPreview: React.FC<BrickPreviewProps> = ({ bricks, previewWidth = 150, previewHeight = 75 }) => {
  if (!bricks || bricks.length === 0) {
    return <div>No preview available</div>;
  }

  const numRows = bricks.length;
  const numCols = bricks[0]?.length || 0;

  if (numRows === 0 || numCols === 0) {
    return <div>No preview available</div>;
  }

  const brickWidth = previewWidth / numCols;
  const brickHeight = previewHeight / numRows;

  return (
    <div 
      className="border border-gray-400 bg-gray-700" 
      style={{ width: previewWidth, height: previewHeight, position: 'relative' }}
    >
      {bricks.map((row, rowIndex) =>
        row.map((brick, colIndex) => {
          if (brick && brick.status > 0) {
            let brickColor = 'bg-gray-500'; // Default color for normal bricks
            if (brick.isSpecial) {
              brickColor = 'bg-yellow-500'; // Special bricks
            }
            if (brick.isBomb) {
              brickColor = 'bg-red-600'; // Bomb bricks
            }
            if (brick.holdsBall) {
              brickColor = 'bg-blue-500'; // Bricks holding a ball
            }
            // Add more conditions for other brick types if needed

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`absolute ${brickColor}`}
                style={{
                  left: colIndex * brickWidth,
                  top: rowIndex * brickHeight,
                  width: brickWidth -1, // -1 for a small gap
                  height: brickHeight -1, // -1 for a small gap
                  opacity: brick.strength / 3, // Example: Dimmer for lower strength
                }}
              />
            );
          }
          return null;
        })
      )}
    </div>
  );
};

export default BrickPreview;
