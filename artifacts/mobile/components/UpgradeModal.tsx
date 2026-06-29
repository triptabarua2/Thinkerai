import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const TEAL = "#0D9488";

const PLANS = [
  {
    id: "free",
    name: "Free Trial",
    badge: null,
    price: "$0",
    period: "",
    yearly: null,
    credits: "50 credits",
    creditSub: "one-time · never refills",
    color: "#64748B",
    current: true,
    features: [
      "Direct chat",
      "Basic clarification",
      "Planner Agent",
      "Reviewer + Judge",
      "3 version saves",
      "■ Low & Medium thinking",
    ],
    locked: [
      "Strategy Agent",
      "Design Agent",
      "Consensus Agent",
    ],
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most Popular",
    price: "$19",
    period: "/month",
    yearly: "$199/year · save $29",
    credits: "1,500 credits",
    creditSub: "per month · renews automatically",
    color: TEAL,
    current: false,
    features: [
      "All Free features",
      "Smart Clarification (3-Level)",
      "Strategy Agent",
      "Design Agent",
      "Critic Agent",
      "Founder Mode",
      "10 version saves",
      "■ High thinking level",
    ],
    locked: ["Consensus Agent", "Decision Memory", "Priority Queue"],
    cta: "Upgrade to Pro",
    ctaDisabled: false,
  },
  {
    id: "founder",
    name: "Founder",
    badge: "Most Powerful",
    price: "$59",
    period: "/month",
    yearly: "$589/year · save $119",
    credits: "5,000 credits",
    creditSub: "per month · renews automatically",
    color: "#8B5CF6",
    current: false,
    features: [
      "All Pro features",
      "Consensus Agent",
      "Decision Memory",
      "Priority Queue",
      "API Access",
      "25 version saves",
      "■ Consensus thinking level",
      "Pipeline Observability",
    ],
    locked: [],
    cta: "Upgrade to Founder",
    ctaDisabled: false,
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function UpgradeModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  function handleUpgrade(plan: typeof PLANS[number]) {
    if (plan.ctaDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Upgrade to ${plan.name}`,
      `${plan.price}${plan.period} · ${plan.credits}\n\nPayment integration coming soon. You'll be billed via Stripe.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            onClose();
            Alert.alert("Coming Soon", "Stripe billing will be available in the next release.");
          },
        },
      ]
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Upgrade Plan</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              More thinking · more power · more credits
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Feather name="x" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Plans */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plansRow}
          snapToInterval={CARD_W + 12}
          decelerationRate="fast"
        >
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              colors={colors}
              onUpgrade={() => handleUpgrade(plan)}
            />
          ))}
        </ScrollView>

        {/* Footer note */}
        <Text style={[styles.footerNote, { color: colors.textTertiary }]}>
          Failover is always free · Cancel anytime · Billed via Stripe
        </Text>
      </View>
    </Modal>
  );
}

const CARD_W = 240;

function PlanCard({
  plan,
  colors,
  onUpgrade,
}: {
  plan: typeof PLANS[number];
  colors: ReturnType<typeof useColors>;
  onUpgrade: () => void;
}) {
  const isHighlighted = plan.id === "pro";

  return (
    <View
      style={[
        styles.card,
        {
          width: CARD_W,
          backgroundColor: isHighlighted ? plan.color + "10" : colors.background,
          borderColor: isHighlighted ? plan.color : colors.border,
          borderWidth: isHighlighted ? 2 : 1,
        },
      ]}
    >
      {/* Badge */}
      {plan.badge ? (
        <View style={[styles.badge, { backgroundColor: plan.color }]}>
          <Text style={styles.badgeText}>{plan.badge}</Text>
        </View>
      ) : (
        <View style={styles.badgePlaceholder} />
      )}

      {/* Plan name */}
      <View style={styles.nameRow}>
        <View style={[styles.planDot, { backgroundColor: plan.color }]} />
        <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
        {plan.current && (
          <View style={[styles.currentBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.currentText, { color: colors.textSecondary }]}>Active</Text>
          </View>
        )}
      </View>

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: plan.color }]}>{plan.price}</Text>
        <Text style={[styles.period, { color: colors.textSecondary }]}>{plan.period}</Text>
      </View>
      {plan.yearly && (
        <Text style={[styles.yearly, { color: plan.color }]}>{plan.yearly}</Text>
      )}

      {/* Credits chip */}
      <View style={[styles.creditChip, { backgroundColor: plan.color + "15", borderColor: plan.color + "30" }]}>
        <Feather name="zap" size={11} color={plan.color} />
        <Text style={[styles.creditText, { color: plan.color }]}>{plan.credits}</Text>
        <Text style={[styles.creditSub, { color: colors.textSecondary }]}>{plan.creditSub}</Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Features */}
      <View style={styles.featureList}>
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Feather name="check" size={12} color={plan.color} />
            <Text style={[styles.featureText, { color: colors.text }]}>{f}</Text>
          </View>
        ))}
        {plan.locked.map((f, i) => (
          <View key={`locked-${i}`} style={styles.featureRow}>
            <Feather name="lock" size={11} color={colors.textTertiary} />
            <Text style={[styles.featureText, { color: colors.textTertiary }]}>{f}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[
          styles.ctaBtn,
          {
            backgroundColor: plan.ctaDisabled ? colors.border : plan.color,
            opacity: plan.ctaDisabled ? 0.7 : 1,
          },
        ]}
        onPress={onUpgrade}
        activeOpacity={plan.ctaDisabled ? 1 : 0.8}
        disabled={plan.ctaDisabled}
      >
        {!plan.ctaDisabled && (
          <Feather name="arrow-up-right" size={14} color="#fff" style={{ marginRight: 4 }} />
        )}
        <Text
          style={[
            styles.ctaText,
            { color: plan.ctaDisabled ? colors.textSecondary : "#fff" },
          ]}
        >
          {plan.cta}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "88%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  plansRow: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 16,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 0,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  badgePlaceholder: {
    height: 22,
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentText: {
    fontSize: 10,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
    marginBottom: 2,
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  period: {
    fontSize: 14,
  },
  yearly: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 10,
  },
  creditChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  creditText: {
    fontSize: 12,
    fontWeight: "700",
  },
  creditSub: {
    fontSize: 10,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  featureList: {
    gap: 7,
    marginBottom: 16,
    flex: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  featureText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 14,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  footerNote: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
});
