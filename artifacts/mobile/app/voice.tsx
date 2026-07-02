import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { getBaseUrl } from "@/lib/api";
import { callVoiceCallback, clearVoiceCallback } from "@/lib/voiceStore";

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

type VoiceState = "idle" | "listening" | "processing" | "done";

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Tap to speak",
  listening: "Listening...",
  processing: "Got it — processing...",
  done: "Done!",
};

export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  function stopRecognition() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }

  async function handleClose() {
    stopRecognition();
    // Stop native recording if active
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    clearVoiceCallback();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }

  // ── Web: Web Speech API ────────────────────────────────────────────────────
  function startListeningWeb() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceState("idle");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "bn-BD,en-US";

    recognition.onstart = () => {
      setVoiceState("listening");
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      const current = final || interim;
      transcriptRef.current = current;
      setTranscript(current);
    };

    recognition.onend = () => {
      setVoiceState("processing");
      recognitionRef.current = null;
      const finalText = transcriptRef.current;
      setTimeout(() => {
        if (finalText.trim()) callVoiceCallback(finalText.trim());
        setVoiceState("done");
        setTimeout(() => router.back(), 300);
      }, 500);
    };

    recognition.onerror = () => {
      setVoiceState("idle");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  // ── Native: expo-av recording → backend Whisper transcription ─────────────
  async function startListeningNative() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Microphone permission needed",
          "Please allow microphone access in Settings to use voice input.",
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setVoiceState("listening");
      setTranscript("");
    } catch (err: any) {
      console.error("Voice start error:", err);
      setVoiceState("idle");
    }
  }

  async function stopAndTranscribeNative() {
    const recording = recordingRef.current;
    if (!recording) return;

    setVoiceState("processing");
    setTranscript("Transcribing...");

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("No recording URI");

      const formData = new FormData();
      formData.append("audio", { uri, name: "audio.m4a", type: "audio/m4a" } as any);

      const res = await fetch(`${getBaseUrl()}api/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Transcription failed" })) as any;
        throw new Error(errBody.error ?? "Transcription failed");
      }

      const { transcript } = await res.json() as { transcript: string };

      if (transcript?.trim()) {
        callVoiceCallback(transcript.trim());
        setTranscript(transcript.trim());
        setVoiceState("done");
        setTimeout(() => router.back(), 600);
      } else {
        setTranscript("No speech detected");
        setVoiceState("idle");
      }
    } catch (err: any) {
      console.error("Voice transcription error:", err);
      recordingRef.current = null;   // ensure stale ref is cleared
      setTranscript("");
      setVoiceState("idle");
      Alert.alert(
        "Voice input failed",
        err?.message?.includes("OPENAI_API_KEY")
          ? "Set OPENAI_API_KEY in Replit Secrets to enable voice transcription."
          : (err?.message ?? "Could not transcribe audio. Please try again."),
      );
    }
  }

  function startListening() {
    if (Platform.OS === "web") {
      startListeningWeb();
    } else {
      startListeningNative();
    }
  }

  function handleTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (voiceState === "idle") {
      startListening();
    } else if (voiceState === "listening") {
      if (Platform.OS === "web") {
        stopRecognition();
      } else {
        stopAndTranscribeNative();
      }
    }
  }

  useEffect(() => {
    return () => {
      stopRecognition();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  return (
    <TouchableOpacity
      style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}
      activeOpacity={1}
      onPress={handleTap}
    >
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

      <View style={styles.center}>
        <CorePulse />
        <Text style={styles.appName}>Thinker AI</Text>
        <Text style={styles.tagline}>Think Beyond Intelligence</Text>
      </View>

      {voiceState === "listening" && (
        <View style={styles.waveRow}>
          {WAVE_HEIGHTS.map((h, i) => (
            <WaveBar key={i} height={h} delay={i * 60} />
          ))}
        </View>
      )}

      {transcript.trim().length > 0 && (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

      <View style={styles.stateBox}>
        <Text style={styles.stateLabel}>{STATE_LABELS[voiceState]}</Text>
        {voiceState === "listening" && (
          <Text style={styles.stopHint}>Tap anywhere to stop</Text>
        )}
      </View>

      <View style={styles.micRow}>
        <View
          style={[
            styles.micBtn,
            {
              backgroundColor: voiceState === "listening" ? TEAL : TEAL + "30",
              borderColor: voiceState === "listening" ? TEAL_LIGHT : TEAL + "50",
            },
          ]}
        >
          <Feather
            name="mic"
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
    marginBottom: 8,
  },
  transcriptBox: {
    marginHorizontal: 32,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: TEAL + "20",
    borderWidth: 1,
    borderColor: TEAL + "50",
    maxWidth: 320,
  },
  transcriptText: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
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
