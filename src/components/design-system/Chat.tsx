/**
 * ChatBubble and ChatComposer: the parts of the "Ask Njam" assistant chat.
 *
 * ChatBubble
 *   assistant - white bubble with the ambient shadow, on the left. Its lower
 *               left corner is tucked in, pointing at the speaker.
 *   user      - forest bubble with light copy, on the right, lower right
 *               corner tucked in.
 * A bubble can hold plain text or richer content (a product with its verdict
 * chip and a button) passed as children.
 *
 * ChatComposer: the white pill pinned to the bottom of the chat, with the
 * message field and a round forest send button. Send is disabled while the
 * field is empty.
 *
 * The assistant answers use the person's rules, and anything the AI read
 * from a label says so in words. No sparkle, no wand: the AI is shown by the
 * Njam mark (AiAvatar).
 */
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { IconButton } from '@/components/design-system/IconButton';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/* ------------------------------------------------------------------ */
/* ChatBubble                                                          */
/* ------------------------------------------------------------------ */

type ChatBubbleProps = {
  from: 'assistant' | 'user';
  /** Plain text for the bubble. Use children instead for richer content. */
  text?: string;
  children?: ReactNode;
};

export function ChatBubble({ from, text, children }: ChatBubbleProps) {
  const { colors, shadows } = useNjamTheme();
  const isUser = from === 'user';

  return (
    <View
      accessibilityLabel={text ? `${isUser ? 'You' : 'Njam'}: ${text}` : undefined}
      style={[
        styles.bubble,
        isUser
          ? [styles.user, { backgroundColor: colors.selected }]
          : [styles.assistant, { backgroundColor: colors.surfaceRaised }, shadows.ambient],
      ]}>
      {text && (
        <Text style={[typography.body, { color: isUser ? colors.inkInverse : colors.ink }]}>{text}</Text>
      )}
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* ChatComposer                                                        */
/* ------------------------------------------------------------------ */

type ChatComposerProps = {
  onSend: (message: string) => void;
  /** An example question, e.g. "Ask about a product or ingredient". */
  placeholder: string;
};

export function ChatComposer({ onSend, placeholder }: ChatComposerProps) {
  const { colors, shadows } = useNjamTheme();
  const [message, setMessage] = useState('');
  const canSend = message.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSend(message.trim());
    setMessage('');
  };

  return (
    <View style={[styles.composer, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <TextInput
        value={message}
        onChangeText={setMessage}
        onSubmitEditing={send}
        returnKeyType="send"
        placeholder={placeholder}
        placeholderTextColor={colors.inkSubtle}
        accessibilityLabel="Message"
        selectionColor={colors.focusRing}
        // Font and size only; a lineHeight pushes TextInput text off-centre on iOS.
        style={[
          styles.input,
          { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.ink },
        ]}
      />
      <IconButton
        icon="arrow_upward"
        accessibilityLabel="Send"
        variant="filled"
        onPress={send}
        disabled={!canSend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: layout.bubbleMaxWidth,
    paddingVertical: space.s3,
    paddingHorizontal: space.s4,
    borderRadius: radius.lg,
    gap: space.s3,
  },
  assistant: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.xs,
  },
  user: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: radius.xs,
  },
  composer: {
    height: layout.buttonHeightLarge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingLeft: space.s5,
    paddingRight: space.s1,
    borderRadius: radius.pill,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: 0,
  },
});
