import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: Props) {
  const dashOffset = useRef(new Animated.Value(400)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <Svg
        width={180}
        height={180}
        viewBox="0 0 100 100"
      >
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
    backgroundColor: "#0B6E69",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
