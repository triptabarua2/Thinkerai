import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  onFinish: () => void;
}

const TOTAL_DURATION = 1500 + 800 + 600 + 400; // trace + fill + hold + fadeout = ~3300ms

export function SplashAnimation({ onFinish }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const dashOffset = useRef(new Animated.Value(400)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "web") {
      // Web: CSS animation handles trace+fill; we just fade out after
      const timer = setTimeout(() => {
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }).start(() => onFinish());
      }, 1500 + 800 + 600);
      return () => clearTimeout(timer);
    } else {
      // Native: replicate via Animated
      Animated.sequence([
        Animated.timing(dashOffset, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(fillOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.delay(600),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => onFinish());
    }
  }, []);

  if (Platform.OS === "web") {
    return (
      <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
        {/* Raw SVG with CSS animation for web */}
        {/* @ts-ignore */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          width="180"
          height="180"
        >
          <style>{`
            .apex-path {
              fill: #0B6E69;
              fill-opacity: 0;
              stroke-dasharray: 400;
              stroke-dashoffset: 400;
              animation:
                traceLogo 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards,
                fillLogo 0.8s ease-in forwards 1.2s;
            }
            @keyframes traceLogo { to { stroke-dashoffset: 0; } }
            @keyframes fillLogo  { to { fill-opacity: 1; } }
          `}</style>
          {/* @ts-ignore */}
          <path
            className="apex-path"
            d="M 50 5 L 65 25 L 80 25 L 95 45 L 65 45 L 65 75 L 50 95 L 35 75 L 35 45 L 5 45 L 20 25 L 35 25 Z"
            stroke="#0B6E69"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </svg>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <Svg width={180} height={180} viewBox="0 0 100 100">
        <AnimatedPath
          d="M 50 5 L 65 25 L 80 25 L 95 45 L 65 45 L 65 75 L 50 95 L 35 75 L 35 45 L 5 45 L 20 25 L 35 25 Z"
          stroke="#0B6E69"
          strokeWidth={6}
          strokeLinejoin="round"
          strokeDasharray={400}
          strokeDashoffset={dashOffset}
          fill="#0B6E69"
          fillOpacity={fillOpacity}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
