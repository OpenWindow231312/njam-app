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
 * field is empty, and while `busy` (Njam is still answering).
 *
 * Ghost text (optional): pass `ghost`, the likely rest of the message, and
 * it is drawn straight after what was typed, in inkSubtle. A small "Use the
 * suggestion" button appears beside send; tapping it adds the ghost to the
 * message. The composer does not fetch ghost text itself: the screen does,
 * from what it hears through `onChangeText`.
 *
 * How the ghost is drawn: React Native has no "placeholder after the
 * cursor", so a Text sits BEHIND the TextInput, which has no background of
 * its own. That Text holds the typed words in a transparent colour, then
 * the ghost in inkSubtle. Because both are one line of the same font and
 * size, the invisible copy pushes the ghost to exactly where the typed text
 * ends. If the two together would not fit on one line (the input would
 * scroll and the copies would drift apart), the ghost is hidden.
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
  /** True while an answer is on its way: send is disabled, typing is not. */
  busy?: boolean;
  /** Called with the message as it changes, e.g. to fetch ghost text. */
  onChangeText?: (message: string) => void;
  /** Ghost text: the likely rest of the message, shown after it in inkSubtle. */
  ghost?: string | null;
};

// Font and size only; a lineHeight pushes TextInput text off-centre on iOS.
// The ghost overlay uses the same two values, so it lines up with the input.
const fieldText = { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize };

export function ChatComposer({ onSend, placeholder, busy = false, onChangeText, ghost }: ChatComposerProps) {
  const { colors, shadows } = useNjamTheme();
  const [message, setMessage] = useState('');
  const [ghostFits, setGhostFits] = useState(true);
  const canSend = message.trim().length > 0 && !busy;
  const showGhost = Boolean(ghost) && ghostFits && message.length > 0;

  const change = (next: string) => {
    setMessage(next);
    onChangeText?.(next);
  };

  const send = () => {
    if (!canSend) return;
    onSend(message.trim());
    change('');
  };

  const acceptGhost = () => {
    if (ghost) change(message + ghost);
  };

  return (
    <View style={[styles.composer, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={styles.field}>
        {ghost && message.length > 0 && (
          // Behind the input, so every tap still lands in the TextInput.
          <View pointerEvents="none" style={styles.ghostLayer}>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              // More than one line means it no longer matches the input.
              onTextLayout={(event) => setGhostFits(event.nativeEvent.lines.length <= 1)}
              style={[fieldText, { opacity: ghostFits ? 1 : 0 }]}>
              <Text style={styles.invisible}>{message}</Text>
              <Text style={{ color: colors.inkSubtle }}>{ghost}</Text>
            </Text>
          </View>
        )}
        <TextInput
          value={message}
          onChangeText={change}
          onSubmitEditing={send}
          returnKeyType="send"
          placeholder={placeholder}
          placeholderTextColor={colors.inkSubtle}
          accessibilityLabel="Message"
          selectionColor={colors.focusRing}
          style={[styles.input, fieldText, { color: colors.ink }]}
        />
      </View>
      {showGhost && (
        <IconButton
          icon="check"
          accessibilityLabel={`Use the suggestion: ${message}${ghost}`}
          color={colors.inkMuted}
          onPress={acceptGhost}
        />
      )}
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
  field: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    // Android gives a TextInput side padding of its own. Zero it, so the
    // typed text starts exactly where the ghost overlay's copy starts.
    paddingHorizontal: 0,
    // The browser draws its own box round a focused input on the web preview;
    // the field's own outline already shows focus.
    outlineWidth: 0,
  },
  ghostLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
  },
  // Takes up exactly the room the typed words take, without being seen.
  invisible: {
    color: 'transparent',
  },
});
