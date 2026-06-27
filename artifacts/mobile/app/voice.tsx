import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThinkerLogo } from "@/components/ThinkerLogo";

const TEAL = "#0B6E69";
const TEAL_LIGHT = "#14B8A6";
const BG = "#0B1220";
const TEXT = "#F9FAFB";
const TEXT_MID = "#94A3B8";

function WaveBar({ delay, height }: { delay: number; height: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 500 + Math.random() * 300,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 500 + Math.random() * 300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width: 4,
        height,
        borderRadius: 2,
        backgroundColor: TEAL_LIGHT,
        opacity: anim,
        transform: [
          {
            scaleY: anim.interpolate({
              inputRange: [0.3, 1],
              outputRange: [0.3, 1],
            }),
          },
        ],
      }}
    />
  );
}

const WAVE_HEIGHTS = [16, 28, 40, 52, 36, 48, 60, 44, 32, 56, 40, 28, 16];

function CorePulse() {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.9,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.4,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.logoWrap}>
      <Animated.View
        style={[
          styles.glowRing,
          { opacity: glow, transform: [{ scale: pulse }] },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <ThinkerLogo size={88} />
      </Animated.View>
    </View>
  );
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Tap to speak",
  listening: "Listening...",
  thinking: "Analyzing your goal...",
  speaking: "Thinker AI is responding...",
};

export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  function handleTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (voiceState === "idle") {
      setVoiceState("listening");
      setTimeout(() => setVoiceState("thinking"), 3000);
      setTimeout(() => setVoiceState("speaking"), 5500);
      setTimeout(() => setVoiceState("idle"), 9000);
    } else {
      setVoiceState("idle");
    }
  }

  function handleClose() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }

  return (
    <TouchableOpacity
      style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}
      activeOpacity={1}
      onPress={handleTap}
    >
      {/* Close button */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleClose}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Feather name="x" size={22} color={TEXT_MID} />
        </TouchableOpacity>
        <Text style={styles.topLabel}>Voice Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Center — logo with Core Pulse */}
      <View style={styles.center}>
        <CorePulse />

        <Text style={styles.appName}>Thinker AI</Text>
        <Text style={styles.tagline}>Think Beyond Intelligence</Text>
      </View>

      {/* Wave animation — only visible when active */}
      {voiceState !== "idle" && (
        <View style={styles.waveRow}>
          {WAVE_HEIGHTS.map((h, i) => (
            <WaveBar key={i} height={h} delay={i * 60} />
          ))}
        </View>
      )}

      {/* State label */}
      <View style={styles.stateBox}>
        <Text style={styles.stateLabel}>{STATE_LABELS[voiceState]}</Text>
        {voiceState !== "idle" && (
          <Text style={styles.stopHint}>Tap anywhere to stop</Text>
        )}
      </View>

      {/* Mic indicator */}
      <View style={styles.micRow}>
        <View
          style={[
            styles.micBtn,
            {
              backgroundColor:
                voiceState === "listening" ? TEAL : TEAL + "30",
              borderColor: voiceState === "listening" ? TEAL_LIGHT : TEAL + "50",
            },
          ]}
        >
          <Feather
            name={voiceState === "idle" ? "mic" : "mic"}
            size={26}
            color={voiceState === "listening" ? "#F9FAFB" : TEXT_MID}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topLabel: {
    color: TEXT_MID,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: TEAL,
  },
  appName: {
    color: TEXT,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  tagline: {
    color: TEXT_MID,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 72,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  stateBox: {
    alignItems: "center",
    gap: 6,
    marginBottom: 32,
  },
  stateLabel: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  stopHint: {
    color: TEXT_MID,
    fontSize: 12,
  },
  micRow: {
    marginBottom: 48,
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
