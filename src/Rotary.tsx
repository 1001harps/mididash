import {
  type FC,
  type TouchEvent,
  useEffect,
  useRef,
  useCallback,
} from "react";

const roundHundredths = (n: number) => Math.round(n * 100) / 100;

export interface RotaryProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  startOffset?: number;
  speed?: number;
  limit?: number;
}

export const Rotary: FC<RotaryProps> = ({
  value,
  onChange,
  size = 80,
  startOffset = -0.15,
  speed = 0.01,
  limit = 1,
}) => {
  const dragging = useRef(false);
  const touchStartY = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging.current && e.movementY !== 0) {
        const change = e.movementY * speed * -1;
        const nextValue = roundHundredths(valueRef.current + change);
        if (nextValue >= 0 && nextValue <= limit) {
          onChange(nextValue);
        }
      }
    },
    [speed, limit, onChange],
  );

  const handleGlobalMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleMouseDown = () => {
    dragging.current = true;
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    dragging.current = true;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    dragging.current = false;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (dragging.current) {
      const touch = e.touches[0];
      const change = (touch.clientY - touchStartY.current) * speed * -1;
      const nextValue = roundHundredths(valueRef.current + change) / 2;
      if (nextValue >= 0 && nextValue <= limit) {
        onChange(nextValue);
      }
      touchStartY.current = touch.clientY;
    }
  };

  const getRotation = (v: number) => (startOffset + v) * 270 * limit;

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [handleMouseMove, handleGlobalMouseUp]);

  const outerStyle: React.CSSProperties = {
    background: "#555",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    display: "flex",
    cursor: "pointer",
    border: "2px solid #666",
  };

  const innerStyle: React.CSSProperties = {
    background: "linear-gradient(to right, #ccc, 50%, rgba(0,0,0,0) 50%)",
    height: "3px",
    width: "100%",
    margin: "auto 0",
  };

  return (
    <div
      className="rotary"
      style={outerStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div
        style={{
          ...innerStyle,
          transform: `rotate(${getRotation(value)}deg)`,
        }}
      />
    </div>
  );
};
