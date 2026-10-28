/**
 * ChatBubble and ChatComposer: the parts of the "Ask Njam" assistant chat.
 *
 * ChatBubble
 *   assistant - white bubble with the ambient shadow, on the left.
 *   user      - forest bubble with light copy, on the right.
 * Both are radius xl all round, with no tucked corner, so a short message
 * reads as a soft pill (approved 28 Oct 2026, after the Zigline prototype).
 * A bubble can hold plain text or richer content (a product with its verdict
 * chip and a button) passed as children.
 *
 * Folding: pass `foldAfter` (Ask Njam passes 8 for your own messages) and a
 * longer text stops at that line with an ellipsis and "Show all". It is cut,
 * not faded, because the product UI has no gradients. Njam's answers never
 * fold. `faded` draws the bubble at opacity.disabled, for a message that did
 * not go through.
 *
 * Hold: pass `onLongPress` and holding the bubble hands back where it is on
 * screen, so the screen can open a MenuPopover right under it.
 *
 * ChatComposer: the typing bar pinned to the bottom of the chat, working as
 * Claude's does (approved 28 Oct 2026). One row: your message, then the
 * round forest send button on the right. As you type, the bar grows up one
 * line at a time and send stays on the bottom line. At MAX_LINES it stops
 * growing and the message scrolls inside it. Return adds a new line; only
 * the send button sends. White with the ambient shadow, radius xl (a pill
 * would clip the text once the bar is several lines tall).
 *
 * "+" (pass `onAdd`) sits on the left of the row, and what it added
 * (`attachment`) sits above the row, so your text stays in line with "+".
 *
 * The send button has three jobs:
 *   send  - an arrow, faded until you type.
 *   stop  - while `busy` (Njam is answering), if you pass `onStop`.
 *   save  - a tick while `editing` an earlier question, which also shows
 *           "Editing your question" and a cross (`onCancelEdit`) on top.
 *
 * Ghost text (optional): pass `ghost`, the likely rest of the message, and
 * it is drawn straight after what was typed, in inkSubtle. Swipe right on
 * the bar to take it; a screen reader gets the same as an action. The
 * composer does not fetch ghost text itself: the screen does, from what it
 * hears through `onChangeText`.
 *
 * How the ghost is drawn: React Native has no "placeholder after the
 * cursor", so a Text sits BEHIND the TextInput, which has no background of
 * its own. That Text holds the typed words in a transparent colour, then
 * the ghost in inkSubtle. Because both use the same font, size and line
 * height, the invisible copy pushes the ghost to exactly where the typed
 * text ends. If the two together would not fit on one line (the copies
 * could wrap differently), the ghost is hidden.
 *
 * The assistant answers use the person's rules, and anything the AI read
 * from a label says so in words. No sparkle, no wand: the AI is shown by the
 * Njam mark (AiAvatar).
 */
import { type ComponentRef, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { IconButton } from '@/components/design-system/IconButton';
import type { MenuAnchor } from '@/components/design-system/MenuPopover';
import { border, layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/* ------------------------------------------------------------------ */
/* ChatBubble                                                          */
/* ------------------------------------------------------------------ */

type ChatBubbleProps = {
  from: 'assistant' | 'user';
  /** Plain text for the bubble. Use children instead for richer content. */
  text?: string;
  children?: ReactNode;
  /** Fold plain text longer than this many lines behind "Show all". */
  foldAfter?: number;
  /** Draw the bubble faded, e.g. a message that did not go through. */
  faded?: boolean;
  /** Called when the bubble is held, with where it is on screen. */
  onLongPress?: (anchor: MenuAnchor) => void;
};

export function ChatBubble({ from, text, children, foldAfter, faded = false, onLongPress }: ChatBubbleProps) {
  const { colors, shadows } = useNjamTheme();
  const bubble = useRef<ComponentRef<typeof View>>(null);
  const isUser = from === 'user';
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textColor = isUser ? colors.inkInverse : colors.ink;
  // On a forest bubble the link is lime, as everywhere on forest; on white it is forest.
  const linkColor = isUser ? colors.onSelected : colors.selected;
  const folded = foldAfter !== undefined && !expanded;

  const hold = () => bubble.current?.measureInWindow((x, y, width, height) => onLongPress?.({ x, y, width, height }));

  return (
    // A Pressable only so it can be held. No `disabled` when there is
    // nothing to hold: a screen reader would read every answer as "dimmed".
    <Pressable
      ref={bubble}
      onLongPress={onLongPress ? hold : undefined}
      accessibilityLabel={text ? `${isUser ? 'You' : 'Njam'}: ${text}` : undefined}
      accessibilityHint={onLongPress ? 'Hold for options' : undefined}
      accessibilityActions={onLongPress ? [{ name: 'longpress', label: 'Options' }] : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') hold();
      }}
      style={[
        styles.bubble,
        isUser
          ? [styles.user, { backgroundColor: colors.selected }]
          : [styles.assistant, { backgroundColor: colors.surfaceRaised }, shadows.ambient],
        faded && { opacity: opacity.disabled },
      ]}>
      {text && (
        <View>
          <Text numberOfLines={folded ? foldAfter : undefined} style={[typography.body, { color: textColor }]}>
            {text}
          </Text>
          {foldAfter !== undefined && (
            // A hidden full copy, laid out at the same width, counts the
            // lines. The visible copy cannot: with numberOfLines set it only
            // reports the lines it shows.
            <Text
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              onTextLayout={(event) => setOverflows(event.nativeEvent.lines.length > foldAfter)}
              style={[typography.body, styles.measure]}>
              {text}
            </Text>
          )}
        </View>
      )}
      {overflows && (
        <Pressable
          onPress={() => setExpanded((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less of your message' : 'Show all of your message'}
          // The label is drawn 16 tall; the slop takes the tap area to 48.
          hitSlop={(layout.touchTargetMin - typography.label.lineHeight) / 2}
          style={styles.showAll}>
          <Text style={[typography.label, { color: linkColor }]}>{expanded ? 'Show less' : 'Show all'}</Text>
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size="xs" color={linkColor} />
        </Pressable>
      )}
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* ChatComposer                                                        */
/* ------------------------------------------------------------------ */

type ChatComposerProps = {
  onSend: (message: string) => void;
  /** An example question, e.g. "Ask about any food". */
  placeholder: string;
  /** True while an answer is on its way: send turns into Stop, typing still works. */
  busy?: boolean;
  /** Stops the answer on its way. Without it, send is only disabled while busy. */
  onStop?: () => void;
  /** Called with the message as it changes, e.g. to fetch ghost text. */
  onChangeText?: (message: string) => void;
  /** Ghost text: the likely rest of the message, shown after it in inkSubtle. */
  ghost?: string | null;
  /** An earlier question being edited. The bar takes its text; send saves it. */
  editing?: string | null;
  onCancelEdit?: () => void;
  /** Shows "+" on the left of the row. */
  onAdd?: () => void;
  /** What "+" added (a product, a label photo), drawn above the row. */
  attachment?: ReactNode;
  /** Send with nothing typed, e.g. a photo on its own. */
  allowEmpty?: boolean;
  /** Puts text back in the bar, e.g. after Undo. A new `id` puts it back again. */
  restore?: { id: number; text: string } | null;
  /** Shows the "Swipe right to take it" hint over the bar while there is a suggestion. */
  swipeHint?: boolean;
  /** Called when a suggestion is taken, so the screen can stop showing the hint. */
  onTakeSuggestion?: () => void;
};

// The bar grows to this many lines, then the message scrolls inside it.
const MAX_LINES = 6;
// How far a finger moves sideways before it counts as a swipe, and how far
// it must go to take the ghost text.
const SWIPE_START = 8;
const SWIPE_TAKE = 48;

// The input and the ghost overlay share these, so the ghost lines up with
// what was typed. A multiline input is laid out from the top, so the line
// height no longer pushes the text off-centre as it did on one line.
const fieldText = {
  fontFamily: typography.body.fontFamily,
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
};

export function ChatComposer({
  onSend,
  placeholder,
  busy = false,
  onStop,
  onChangeText,
  ghost,
  editing = null,
  onCancelEdit,
  onAdd,
  attachment,
  allowEmpty = false,
  restore = null,
  swipeHint = false,
  onTakeSuggestion,
}: ChatComposerProps) {
  const { colors, shadows } = useNjamTheme();
  const [message, setMessage] = useState('');
  const [ghostFits, setGhostFits] = useState(true);
  const canSend = (message.trim().length > 0 || allowEmpty) && !busy;
  const showGhost = Boolean(ghost) && ghostFits && message.length > 0;

  const change = useCallback(
    (next: string) => {
      setMessage(next);
      onChangeText?.(next);
    },
    [onChangeText],
  );

  // Editing puts the earlier question in the bar; cancelling empties it.
  // Done while rendering, as React suggests for state that follows a prop,
  // rather than in an effect that would draw the old text first.
  const [shownEditing, setShownEditing] = useState(editing);
  if (editing !== shownEditing) {
    setShownEditing(editing);
    setMessage(editing ?? '');
  }
  const [shownRestore, setShownRestore] = useState(restore);
  if (restore !== shownRestore) {
    setShownRestore(restore);
    if (restore) setMessage(restore.text);
  }

  const send = () => {
    if (!canSend) return;
    onSend(message.trim());
    change('');
  };

  const acceptGhost = useCallback(() => {
    if (!ghost) return;
    change(message + ghost);
    onTakeSuggestion?.();
  }, [change, ghost, message, onTakeSuggestion]);

  // Made again when the suggestion changes, so it always swipes in the one on screen.
  const swipe = useMemo(
    () =>
      PanResponder.create({
        // Taps and vertical scrolling stay with the input; only a clear
        // sideways drag over a suggestion becomes a swipe.
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          showGhost && gesture.dx > SWIPE_START && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx > SWIPE_TAKE) acceptGhost();
        },
      }),
    [showGhost, acceptGhost],
  );

  const action = busy && onStop ? 'stop' : editing !== null ? 'save' : 'send';

  return (
    <View style={styles.stack}>
      {swipeHint && showGhost && (
        // Forest with lime words: the one place on the pale ground where a
        // hint has to stand out from the white bar under it.
        <View style={[styles.hint, { backgroundColor: colors.selected }]}>
          <Text style={[typography.label, { color: colors.onSelected }]}>Swipe right to take it</Text>
          <Icon name="arrow_forward" size="xs" color={colors.onSelected} />
        </View>
      )}
      <View style={[styles.composer, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
        {editing !== null && (
          <View style={[styles.editing, { borderBottomColor: colors.line }]}>
            <Icon name="edit" size="sm" color={colors.inkMuted} />
            <Text style={[typography.label, styles.editingLabel, { color: colors.inkMuted }]}>
              Editing your question
            </Text>
            <IconButton icon="close" accessibilityLabel="Stop editing" onPress={() => onCancelEdit?.()} />
          </View>
        )}
        {attachment && <View style={styles.attachment}>{attachment}</View>}
        <View style={styles.row}>
          {onAdd && <IconButton icon="add" accessibilityLabel="Add a barcode or a label photo" onPress={onAdd} />}
          <View
            {...swipe.panHandlers}
            style={[styles.field, onAdd && styles.fieldAfterAdd]}
            accessibilityActions={showGhost ? [{ name: 'useSuggestion', label: 'Use the suggestion' }] : undefined}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'useSuggestion') acceptGhost();
            }}>
            {ghost && message.length > 0 && (
              // Behind the input, so every tap still lands in the TextInput.
              <View pointerEvents="none" style={[styles.ghostLayer, { left: onAdd ? 0 : space.s4 }]}>
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
              multiline
              placeholder={placeholder}
              placeholderTextColor={colors.inkSubtle}
              accessibilityLabel="Message"
              selectionColor={colors.focusRing}
              style={[styles.input, fieldText, { color: colors.ink }]}
            />
          </View>
          {action === 'stop' && (
            <IconButton icon="stop" accessibilityLabel="Stop answering" variant="filled" onPress={() => onStop?.()} />
          )}
          {action === 'save' && (
            <IconButton
              icon="check"
              accessibilityLabel="Save and ask again"
              variant="filled"
              onPress={send}
              disabled={!canSend}
            />
          )}
          {action === 'send' && (
            <IconButton
              icon="arrow_upward"
              accessibilityLabel="Send"
              variant="filled"
              onPress={send}
              disabled={!canSend}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: layout.bubbleMaxWidth,
    paddingVertical: space.s3,
    paddingHorizontal: space.s4,
    borderRadius: radius.xl,
    gap: space.s3,
  },
  assistant: {
    alignSelf: 'flex-start',
  },
  user: {
    alignSelf: 'flex-end',
  },
  // Laid out over the visible text at the same width, never seen.
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.s1,
  },
  stack: {
    gap: space.s2,
  },
  hint: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    paddingVertical: space.s2,
    paddingLeft: space.s4,
    paddingRight: space.s3,
    borderRadius: radius.pill,
  },
  composer: {
    borderRadius: radius.xl,
    padding: space.s1,
  },
  attachment: {
    paddingTop: space.s2,
    paddingHorizontal: space.s2,
  },
  editing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingLeft: space.s3,
    borderBottomWidth: border.hairline,
  },
  editingLabel: {
    flex: 1,
  },
  // Send sits on the bottom line, beside the last line you typed.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.s2,
  },
  field: {
    flex: 1,
    paddingLeft: space.s4,
  },
  // "+" already gives the text room on its left.
  fieldAfterAdd: {
    paddingLeft: 0,
  },
  input: {
    // One line sits in the middle of the 48 send button; more lines grow up.
    paddingTop: space.s3,
    paddingBottom: space.s3,
    maxHeight: MAX_LINES * typography.body.lineHeight + 2 * space.s3,
    // Android gives a TextInput side padding of its own. Zero it, so the
    // typed text starts exactly where the ghost overlay's copy starts.
    paddingHorizontal: 0,
    // Android centres a multiline input's text; start it at the top as iOS does.
    textAlignVertical: 'top',
    // The browser draws its own box round a focused input on the web preview;
    // the field's own outline already shows focus.
    outlineWidth: 0,
  },
  ghostLayer: {
    position: 'absolute',
    top: space.s3,
    right: 0,
    left: 0,
  },
  // Takes up exactly the room the typed words take, without being seen.
  invisible: {
    color: 'transparent',
  },
});
