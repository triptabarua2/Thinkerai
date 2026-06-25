import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface Props {
  rule: string;
  confirmation: string;
  colors: Record<string, string>;
}

export function DecisionMemoryBanner({ rule, confirmation, colors }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: "#10B98115", borderColor: "#10B98140", opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: "#10B98125" }]}>
        <Feather name="bookmark" size={13} color="#10B981" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.confirmation}>{confirmation}</Text>
        <Text style={styles.rule} numberOfLines={2}>{rule}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    margin: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
  },
  confirmation: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 2,
  },
  rule: {
    fontSize: 11,
    color: "#10B981cc",
    lineHeight: 15,
  },
});
