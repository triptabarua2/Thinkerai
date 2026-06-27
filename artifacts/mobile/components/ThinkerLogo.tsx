import React from "react";
import Svg, { Rect, Path, G } from "react-native-svg";

interface Props {
  size?: number;
}

export function ThinkerLogo({ size = 32 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 500 500">
      <Rect width="500" height="500" rx="110" fill="#0B6E69" />
      <G transform="translate(100 100) scale(3)">
        <Path
          d="M50 5 L65 25 L80 25 L95 45 L65 45 L65 75 L50 95 L35 75 L35 45 L5 45 L20 25 L35 25 Z"
          fill="#FFFFFF"
        />
      </G>
    </Svg>
  );
}
