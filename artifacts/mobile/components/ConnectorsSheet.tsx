import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useConnectors, type ConnectorApp } from "@/hooks/useConnectors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ConnectorsSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { apps, connectedIds, toggleConnector } = useConnectors();

  const SHEET_HEIGHT = 120 + apps.length * 66 + insets.bottom;

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function animateOpen() {
    dragY.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function animateClose() {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }

  useEffect(() => {
    if (visible) {
      animateOpen();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.6) {
          animateClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 22,
            stiffness: 320,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  function handleToggle(app: ConnectorApp) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleConnector(app.id);
  }

  const connectedCount = connectedIds.length;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={animateClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={animateClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.55)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 20 : 0) + 8,
            transform: [{ translateY: Animated.add(translateY, dragY) }],
          },
        ]}
      >
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Connect apps</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {connectedCount > 0
                ? `${connectedCount} app${connectedCount > 1 ? "s" : ""} connected`
                : "Let Thinker AI reference your tools in this chat"}
            </Text>
          </View>
          <TouchableOpacity onPress={animateClose} hitSlop={8}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.list, { borderColor: colors.border }]}>
          {apps.map((app, i) => {
            const isConnected = connectedIds.includes(app.id);
            return (
              <TouchableOpacity
                key={app.id}
                style={[
                  styles.row,
                  i < apps.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleToggle(app)}
              >
                <View
                  style={[
                    styles.rowIcon,
                    {
                      backgroundColor: isConnected
                        ? colors.primary + "18"
                        : colors.surface,
                    },
                  ]}
                >
                  <Feather
                    name={app.icon as any}
                    size={16}
                    color={isConnected ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>
                    {app.label}
                  </Text>
                  <Text
                    style={[styles.rowDesc, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {app.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.connectPill,
                    isConnected
                      ? { backgroundColor: colors.success + "1E" }
                      : { borderWidth: 1, borderColor: colors.border },
                  ]}
                >
                  {isConnected && (
                    <Feather name="check" size={11} color={colors.success} />
                  )}
                  <Text
                    style={[
                      styles.connectPillText,
                      { color: isConnected ? colors.success : colors.textSecondary },
                    ]}
                  >
                    {isConnected ? "Connected" : "Connect"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12.5,
  },
  list: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowDesc: {
    fontSize: 11.5,
    marginTop: 1,
  },
  connectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  connectPillText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
});
