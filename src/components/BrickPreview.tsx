import React from 'react';
import { Brick } from '../interfaces';
import {
    NORMAL_BRICK_COLOR,
    REINFORCED_BRICK_COLOR,
    UPGRADED_BRICK_COLOR,
    SPECIAL_BRICK_COLOR,
    BOMB_BRICK_COLOR,
    BALL_BRICK_COLOR,
    NORMAL_BRICK_STRENGTH,
    REINFORCED_BRICK_STRENGTH,
    UPGRADED_BRICK_STRENGTH
} from '../constants';

interface BrickPreviewProps {
  bricks: Brick[][];
  previewWidth?: number;
  previewHeight?: number;
}

const BrickPreview: React.FC<BrickPreviewProps> = ({ bricks, previewWidth = 300, previewHeight = 75 }) => {
  if (!bricks || bricks.length === 0) {
    return <div style={{ width: previewWidth, height: previewHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="border border-gray-400 bg-gray-700 text-gray-300">No preview data</div>;
  }

  const numCols = bricks.length;
  let numRows = 0;
  // Find the number of rows from the first non-empty column
  const firstPopulatedColumn = bricks.find(col => col && col.length > 0);
  if (firstPopulatedColumn) {
    numRows = firstPopulatedColumn.length;
  }

  // If no rows were found in any column (e.g., all columns are empty or rows per column is 0)
  if (numRows === 0) {
    return <div style={{ width: previewWidth, height: previewHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="border border-gray-400 bg-gray-700 text-gray-300">Level design has no rows</div>;
  }

  const brickWidth = previewWidth / numCols;
  const brickHeight = previewHeight / numRows;

  return (
    <div 
      className="border border-gray-400 bg-gray-700" 
      style={{ width: previewWidth, height: previewHeight, position: 'relative' }}
    >
      {bricks.map((column, colIndex) =>
        column.map((brick, rowIndex) => {
          if (brick && brick.status > 0) {
            let brickColor = NORMAL_BRICK_COLOR; // Default

            if (brick.isBomb) {
              brickColor = BOMB_BRICK_COLOR;
            } else if (brick.isSpecial) {
              brickColor = SPECIAL_BRICK_COLOR;
            } else if (brick.holdsBall) {
              brickColor = BALL_BRICK_COLOR;
            } else if (brick.strength === REINFORCED_BRICK_STRENGTH) {
              brickColor = REINFORCED_BRICK_COLOR;
            } else if (brick.strength === UPGRADED_BRICK_STRENGTH || (brick.upgradeLevel && brick.upgradeLevel > 0)) {
              brickColor = UPGRADED_BRICK_COLOR;
            } else if (brick.strength === NORMAL_BRICK_STRENGTH) {
              brickColor = NORMAL_BRICK_COLOR;
            }

            return (
              <div
                key={`${colIndex}-${rowIndex}`}
                className={`absolute`}
                style={{
                  left: colIndex * brickWidth,
                  top: rowIndex * brickHeight,
                  width: Math.max(1, brickWidth -1),
                  height: Math.max(1, brickHeight -1),
                  backgroundColor: brickColor,
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
