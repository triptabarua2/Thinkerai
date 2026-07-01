import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import * as ExpoClipboard from "expo-clipboard";
import {
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { Message } from "@/context/AppContext";
import { AGENTS } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";
import { isRTL } from "@/hooks/useRTL";

const USER_TEAL = "#0D9488";
const USER_TEAL_DARK = "#0F766E";

interface Props {
  message: Message;
  onReload?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onReply?: (message: Message) => void;
}

function copyToClipboard(text: string) {
  ExpoClipboard.setStringAsync(text).catch(() => {});
}

async function shareText(text: string) {
  try {
    await Share.share({ message: text });
  } catch {}
}

function renderInlineText(text: string, baseColor: string, codeColor: string, codeBg: string) {
  const segments = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return (
        <Text key={i} style={{ fontWeight: "700" as const, color: baseColor }}>
          {seg.slice(2, -2)}
        </Text>
      );
    }
    if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
      return (
        <Text
          key={i}
          style={{
            fontFamily: "monospace",
            color: codeColor,
            backgroundColor: codeBg,
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          {seg.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={i} style={{ color: baseColor }}>
        {seg}
      </Text>
    );
  });
}

function MessageContent({
  content,
  textColor,
  codeColor,
  codeBg,
  colors,
}: {
  content: string;
  textColor: string;
  codeColor: string;
  codeBg: string;
  colors: any;
}) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1).join("\n").replace(/```$/, "");
          return (
            <View
              key={i}
              style={[styles.codeBlock, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            >
              {lang ? (
                <Text style={[styles.codeLang, { color: colors.accent }]}>{lang}</Text>
              ) : null}
              <Text style={[styles.codeText, { color: "#A8FF78" }]}>{code.trim()}</Text>
            </View>
          );
        }
        const lines = part.split("\n");
        return (
          <View key={i}>
            {lines.map((line, li) => {
              if (line.startsWith("# ")) {
                return (
                  <Text key={li} style={[styles.h1, { color: textColor }]}>
                    {line.slice(2)}
                  </Text>
                );
              }
              if (line.startsWith("## ")) {
                return (
                  <Text key={li} style={[styles.h2, { color: textColor }]}>
                    {line.slice(3)}
                  </Text>
                );
              }
              if (line.startsWith("- ") || line.startsWith("• ")) {
                return (
                  <View key={li} style={styles.bulletRow}>
                    <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                    <Text style={[styles.messageText, { color: textColor }]}>
                      {renderInlineText(line.slice(2), textColor, codeColor, codeBg)}
                    </Text>
                  </View>
                );
              }
              if (/^\d+\. /.test(line)) {
                const match = line.match(/^(\d+)\. (.*)/);
                if (match) {
                  return (
                    <View key={li} style={styles.bulletRow}>
                      <Text style={[styles.bullet, { color: colors.primary }]}>{match[1]}.</Text>
                      <Text style={[styles.messageText, { color: textColor }]}>
                        {renderInlineText(match[2], textColor, codeColor, codeBg)}
                      </Text>
                    </View>
                  );
                }
              }
              if (line === "") {
                return <View key={li} style={styles.spacer} />;
              }
              return (
                <Text key={li} style={[styles.messageText, { color: textColor }]}>
                  {renderInlineText(line, textColor, codeColor, codeBg)}
                </Text>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

export const MessageBubble = React.memo(function MessageBubble({ message, onReload, onEdit, onReply }: Props) {
  const colors = useColors();
  const isUser = message.role === "user";
  const agent = message.agentType ? AGENTS[message.agentType] : null;
  const [liked, setLiked] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);

  const rtl = isRTL(message.language ?? "en");
  const textAlign = rtl ? "right" : "left";

  function handleCopy() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    shareText(message.content);
  }

  function handleLike() {
    Haptics.selectionAsync();
    setLiked((prev) => (prev === "up" ? null : "up"));
  }

  function handleDislike() {
    Haptics.selectionAsync();
    setLiked((prev) => (prev === "down" ? null : "down"));
  }

  if (isUser) {
    return (
      <View style={[styles.userWrapper, rtl && { alignItems: "flex-start" }]}>
        <View style={[styles.userBubble, { backgroundColor: USER_TEAL }]}>
          <MessageContent
            content={message.content}
            textColor="#FFFFFF"
            codeColor="#E0FFFA"
            codeBg="rgba(255,255,255,0.15)"
            colors={colors}
          />
        </View>
        <View style={[styles.actionRow, rtl && { flexDirection: "row-reverse" }]}>
          <ActionBtn
            icon={copied ? "check" : "copy"}
            label={copied ? "Copied" : "Copy"}
            color={copied ? "#34C759" : colors.textTertiary}
            onPress={handleCopy}
          />
          <ActionBtn icon="share-2" label="Share" color={colors.textTertiary} onPress={handleShare} />
          {onEdit && (
            <ActionBtn
              icon="edit-2"
              label="Edit"
              color={colors.textTertiary}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEdit(message); }}
            />
          )}
          {onReload && (
            <ActionBtn
              icon="refresh-cw"
              label="Resend"
              color={colors.textTertiary}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReload(message); }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.aiWrapper, rtl && { alignItems: "flex-end" }]}>
      {agent && (
        <View style={[styles.agentTag, rtl && { flexDirection: "row-reverse" }]}>
          <Feather name={agent.icon as any} size={10} color={agent.color} />
          <Text style={[styles.agentTagText, { color: agent.color }]}>{agent.shortName}</Text>
        </View>
      )}

      <View style={{ textAlign } as any}>
        <MessageContent
          content={message.content}
          textColor={colors.text}
          codeColor={colors.accent}
          codeBg={colors.border}
          colors={colors}
        />
      </View>

      <View style={[styles.actionRow, rtl && { flexDirection: "row-reverse" }]}>
        <ActionBtn
          icon={copied ? "check" : "copy"}
          label={copied ? "Copied" : "Copy"}
          color={copied ? "#34C759" : colors.textTertiary}
          onPress={handleCopy}
        />
        {onReload && (
          <ActionBtn
            icon="refresh-cw"
            label="Retry"
            color={colors.textTertiary}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReload(message); }}
          />
        )}
        <ActionBtn icon="share-2" label="Share" color={colors.textTertiary} onPress={handleShare} />
        {onReply && (
          <ActionBtn
            icon="corner-up-left"
            label="Reply"
            color={colors.textTertiary}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReply(message); }}
          />
        )}
        <ActionBtn
          icon="thumbs-up"
          label="Like"
          color={liked === "up" ? "#34C759" : colors.textTertiary}
          onPress={handleLike}
        />
        <ActionBtn
          icon="thumbs-down"
          label="Dislike"
          color={liked === "down" ? "#FF3B30" : colors.textTertiary}
          onPress={handleDislike}
        />
      </View>
    </View>
  );
}, (prev, next) =>
  prev.message.id === next.message.id &&
  prev.message.content === next.message.content &&
  prev.message.role === next.message.role
);

function ActionBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.6} hitSlop={6}>
      <Feather name={icon as any} size={13} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  userWrapper: {
    marginHorizontal: 16,
    marginVertical: 4,
    alignItems: "flex-end",
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
  userBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  aiWrapper: {
    marginHorizontal: 16,
    marginVertical: 4,
    alignItems: "flex-start",
    maxWidth: "92%",
    alignSelf: "flex-start",
  },
  agentTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
    marginLeft: 2,
  },
  agentTagText: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 5,
    marginLeft: 2,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flexWrap: "wrap",
  },
  h1: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 6,
    marginTop: 4,
  },
  h2: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 4,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 2,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700" as const,
    width: 14,
  },
  spacer: {
    height: 6,
  },
  codeBlock: {
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  codeLang: {
    fontSize: 11,
    fontWeight: "600" as const,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  codeText: {
    fontSize: 13,
    fontFamily: "monospace",
    lineHeight: 20,
  },
});
