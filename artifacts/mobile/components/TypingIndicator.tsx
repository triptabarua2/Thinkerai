import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function TypingIndicator() {
  const colors = useColors();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeDotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.delay(300 - delay),
        ])
      );

    const a1 = makeDotAnim(dot1, 0);
    const a2 = makeDotAnim(dot2, 140);
    const a3 = makeDotAnim(dot3, 280);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (dot: Animated.Value) => ({
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -7],
        }),
      },
    ],
    opacity: dot.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] }),
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Animated.View
        style={[styles.dot, { backgroundColor: colors.primary }, dotStyle(dot1)]}
      />
      <Animated.View
        style={[styles.dot, { backgroundColor: colors.primary }, dotStyle(dot2)]}
      />
      <Animated.View
        style={[styles.dot, { backgroundColor: colors.primary }, dotStyle(dot3)]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
