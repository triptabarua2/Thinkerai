import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Rect, Path, G, Circle, Line } from "react-native-svg";

interface Props {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(900),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Svg width={120} height={120} viewBox="0 0 500 500">
          <Rect width="500" height="500" rx="110" fill="#0B6E69" />
          <G transform="translate(100 100) scale(3)">
            <Path
              d="M50 5 L65 25 L80 25 L95 45 L65 45 L65 75 L50 95 L35 75 L35 45 L5 45 L20 25 L35 25 Z"
              fill="#FFFFFF"
            />
          </G>
        </Svg>
      </Animated.View>
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
