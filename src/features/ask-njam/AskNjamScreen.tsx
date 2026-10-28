/**
 * Ask Njam: the assistant. Recipes with a product you scanned, why something
 * got its verdict, what an ingredient or E-number is, and what to eat instead.
 *
 * Layout, from the Figma proposal of 28 Oct 2026 (after the Zigline prototype):
 *   header   - back on the left; the Njam logo and "Ask Njam" in the middle,
 *              a button that opens a small menu (new conversation, your
 *              conversations, what Njam can help with); a new conversation
 *              on the right.
 *   messages - ChatBubbles: a greeting, then the conversation. Your long
 *              messages fold after 8 lines. Under Njam's latest answer:
 *              Copy and Ask again.
 *   bottom   - follow-up suggestions as chips, then the ChatComposer.
 *
 * What you can do with a message you sent:
 *   hold it      - Edit your question, or Copy it.
 *   edit it      - it goes back into the bar; everything after it fades.
 *                  Saving deletes it and everything after it, then asks again.
 *   Stop         - while Njam answers. Your question stays, with Ask again.
 *   no signal    - it stays, faded, with "Did not go through" and Try again.
 *                  Nothing is sent again until you tap it.
 *
 * What the screen does not do: decide anything. Njam's words come from the
 * ask-njam edge function, which saves the conversation; every verdict chip
 * comes from the verdict engine (AnswerBlocks.tsx).
 */
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AiAvatar,
  BottomSheet,
  Button,
  ChatBubble,
  ChatComposer,
  FilterChip,
  FrostedStrip,
  Icon,
  IconButton,
  LoadingMark,
  MenuPopover,
  Snackbar,
  type MenuAnchor,
} from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { useAuth } from '@/features/auth/AuthProvider';
import { AnswerBlock } from '@/features/ask-njam/AnswerBlocks';
import { deleteFromQuestion, fetchMessages, type ChatMessage } from '@/features/ask-njam/conversations';
import { ConversationsMenu } from '@/features/ask-njam/ConversationsMenu';
import { useGhostText } from '@/features/ask-njam/use-ghost-text';
import { fetchActiveProfile } from '@/features/profile/active-profile';
import { AskNjamError, askNjam } from '@/services/ai';
import { allergenWord, type ProfileRule } from '@/services/verdict';
import { icon, layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

// Your own messages fold after this many lines; Njam's answers never fold.
const FOLD_AFTER_LINES = 8;

// A stable empty list, so the answer blocks do not reload on every render.
const NO_RULES: ProfileRule[] = [];

// What Njam answers, for "What Njam can help with" in the logo menu.
const CAN_HELP_WITH = [
  'Recipes with a product you scanned or name',
  'Why a product got its verdict',
  'What an ingredient, allergen or E-number is',
  'What to eat instead',
];

/**
 * A message on screen. Only your own messages carry a status:
 *   failed  - it did not reach Njam, so it was never saved.
 *   stopped - you stopped the answer. The edge function still saved the
 *             question and its answer, so it comes back when you reopen
 *             the conversation.
 */
type ShownMessage = ChatMessage & { status?: 'failed' | 'stopped'; sentAt?: Date };

/** "Hi Anika. Ask me about any product or ingredient and I will check it against your 3 rules." */
function greeting(firstName: string, rules: ProfileRule[] | null): string {
  const hello = `Hi ${firstName}.`;
  if (rules === null) return `${hello} Ask me about any product or ingredient.`;
  if (rules.length === 0) {
    return `${hello} You have no rules yet, so I have nothing to check against. Add some on your profile, then ask me anything about food.`;
  }
  const count = `${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}`;
  return `${hello} Ask me about any product or ingredient and I will check it against your ${count}.`;
}

/** Three ways in for an empty conversation, from your own rules where possible. */
function starterPrompts(rules: ProfileRule[] | null): string[] {
  const eNumber = rules?.find((rule) => rule.type === 'e_number');
  const allergen = rules?.find((rule) => rule.type === 'allergen');
  return [
    eNumber ? `What is ${eNumber.target.toUpperCase()}?` : 'What is E330?',
    'Give me a quick dinner idea',
    allergen ? `What can I use instead of ${allergenWord(allergen.target)}?` : 'What can I snack on instead?',
  ];
}

/** The text a person typed, from their message's single text block. */
function userText(message: ChatMessage): string {
  const block = message.blocks.find((item) => item.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}

/** Everything Njam wrote in an answer, for Copy. Products and suggestions are left out. */
function answerText(message: ChatMessage): string {
  return message.blocks
    .map((block) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'recipe') return [block.title, ...block.steps].join('\n');
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/** "09:32", when a message that did not go through was sent. */
function timeOf(date: Date | undefined): string {
  return date ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
}

/**
 * Which of your saved questions this is, counting from 0: the same count
 * deleteFromQuestion uses. Questions that did not go through were never
 * saved, so they are not counted.
 */
function savedQuestionIndex(messages: ShownMessage[], index: number): number {
  return messages.slice(0, index).filter((message) => message.role === 'user' && message.status !== 'failed').length;
}

type Failure = { message: string; retryText: string | null };

export function AskNjamScreen() {
  const { colors } = useNjamTheme();
  const insets = useSafeAreaInsets();
  const { member } = useAuth();
  const { ghost, onChangeText } = useGhostText();

  const [rules, setRules] = useState<ProfileRule[] | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ShownMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [copied, setCopied] = useState(false);
  const [conversationsOpen, setConversationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [logoAnchor, setLogoAnchor] = useState<MenuAnchor | null>(null);
  const [held, setHeld] = useState<{ index: number; anchor: MenuAnchor } | null>(null);
  // The question being edited: its place in `messages` and its text.
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const logo = useRef<ComponentRef<typeof View>>(null);
  // Bumped whenever a different conversation is put on screen. An answer
  // that comes back for the old one is then dropped, not mixed in.
  const shownConversation = useRef(0);
  // Bumped by every question and by Stop. An answer for an older number was
  // stopped (or overtaken), so it is not shown.
  const latestRequest = useRef(0);

  useEffect(() => {
    if (!member?.householdId) return;
    fetchActiveProfile(member.householdId)
      .then((profile) => setRules(profile?.rules ?? []))
      .catch(() => setFailure({ message: 'We could not load your rules.', retryText: null }));
  }, [member?.householdId]);

  // With the keyboard up, the home-indicator strip is hidden behind it, so
  // the composer no longer needs to clear it.
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const firstName = member?.displayName.split(' ')[0] ?? 'there';
  const lastAnswer = messages.findLastIndex((message) => message.role === 'assistant');

  // The latest answer's suggestions, or starters for an empty conversation.
  const prompts = useMemo(() => {
    if (busy || loadingConversation || editing) return [];
    const last = messages.at(-1);
    if (!last) return starterPrompts(rules);
    if (last.role !== 'assistant') return [];
    const block = last.blocks.find((item) => item.type === 'suggestions');
    return block && block.type === 'suggestions' ? block.prompts : [];
  }, [busy, loadingConversation, editing, messages, rules]);

  function send(text: string) {
    if (busy) return;
    const asked = shownConversation.current;
    latestRequest.current += 1;
    const request = latestRequest.current;
    // Shown straight away. The function saves the question only together
    // with its answer, so until then it exists only here.
    const pending: ShownMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      blocks: [{ type: 'text', text }],
      sentAt: new Date(),
    };
    setMessages((current) => [...current, pending]);
    setFailure(null);
    setBusy(true);

    askNjam(text, conversationId)
      .then((answer) => {
        if (shownConversation.current !== asked) return;
        // Even a stopped answer was saved, in this conversation, so carry on in it.
        setConversationId(answer.conversationId);
        if (latestRequest.current !== request) return;
        setMessages((current) => [
          ...current,
          { id: `answer-${Date.now()}`, role: 'assistant', blocks: answer.blocks },
        ]);
      })
      .catch((error) => {
        if (shownConversation.current !== asked || latestRequest.current !== request) return;
        // Keep your question on screen, faded, with Try again under it.
        setMessages((current) =>
          current.map((message) => (message.id === pending.id ? { ...message, status: 'failed' } : message)),
        );
        if (error instanceof AskNjamError) setFailure({ message: error.message, retryText: null });
      })
      .finally(() => {
        // Stop, startNew and openConversation already cleared busy for theirs.
        if (shownConversation.current === asked && latestRequest.current === request) setBusy(false);
      });
  }

  /** Stop the answer on its way. Your question stays, marked stopped. */
  function stop() {
    latestRequest.current += 1;
    setBusy(false);
    setMessages((current) =>
      current.map((message, index) =>
        index === current.length - 1 && message.role === 'user' ? { ...message, status: 'stopped' } : message,
      ),
    );
  }

  /**
   * Ask a question again from where it was: an edited question, Ask again
   * under the latest answer, or after Stop. The saved question and
   * everything after it are deleted first, so the conversation Njam reads
   * is the one you see.
   */
  function askAgainFrom(index: number, text: string) {
    const question = messages[index];
    const removeSaved =
      conversationId && question.status !== 'failed'
        ? deleteFromQuestion(conversationId, savedQuestionIndex(messages, index))
        : Promise.resolve();
    removeSaved
      .then(() => {
        setEditing(null);
        setMessages((current) => current.slice(0, index));
        send(text);
      })
      .catch(() => setFailure({ message: 'We could not change that question. Try again.', retryText: null }));
  }

  /** Try again on a question that did not go through: it was never saved, so just send it. */
  function tryAgain(index: number) {
    const text = userText(messages[index]);
    setMessages((current) => current.filter((_, at) => at !== index));
    send(text);
  }

  function copy(text: string) {
    Clipboard.setStringAsync(text)
      .then(() => setCopied(true))
      .catch(() => setFailure({ message: 'We could not copy that.', retryText: null }));
  }

  function startNew() {
    shownConversation.current += 1;
    setConversationsOpen(false);
    setConversationId(null);
    setMessages([]);
    setFailure(null);
    setEditing(null);
    setBusy(false);
  }

  function openConversation(id: string) {
    shownConversation.current += 1;
    const opening = shownConversation.current;
    setConversationsOpen(false);
    setConversationId(id);
    setMessages([]);
    setFailure(null);
    setEditing(null);
    setBusy(false);
    setLoadingConversation(true);
    fetchMessages(id)
      .then((saved) => {
        if (shownConversation.current === opening) setMessages(saved);
      })
      .catch(() => {
        if (shownConversation.current === opening) {
          setFailure({ message: 'We could not open that conversation.', retryText: null });
        }
      })
      .finally(() => {
        if (shownConversation.current === opening) setLoadingConversation(false);
      });
  }

  function openLogoMenu() {
    logo.current?.measureInWindow((x, y, width, height) => setLogoAnchor({ x, y, width, height }));
  }

  const thinkingLine =
    rules && rules.length > 0
      ? `Checking against your ${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}`
      : 'Njam is thinking it over';

  return (
    <View style={[styles.page, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.column,
            { paddingTop: insets.top, paddingBottom: keyboardOpen ? space.s2 : insets.bottom + space.s4 },
          ]}>
          {/* Back on the left, the logo in the middle (tap it for the menu),
              a new conversation on the right. */}
          <View style={styles.header}>
            <View style={styles.back}>
              <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={() => router.back()} />
            </View>
            <IconButton
              icon="add"
              variant="tonal"
              accessibilityLabel="Start a new conversation"
              onPress={startNew}
            />
            {/* Laid over the row, so the logo sits in the true middle of the
                screen whatever the two buttons beside it measure. */}
            <View pointerEvents="box-none" style={styles.titleLayer}>
              <View ref={logo} collapsable={false}>
                <PressableSurface
                  onPress={openLogoMenu}
                  accessibilityRole="button"
                  accessibilityLabel="Ask Njam, answers use your rules"
                  accessibilityHint="Opens the Ask Njam menu"
                  radius={radius.pill}
                  style={styles.title}>
                  <AiAvatar size={icon.sizeXl} />
                  <Text style={[typography.headline, { color: colors.ink }]}>Ask Njam</Text>
                  <Icon name="expand_more" size="sm" color={colors.inkMuted} />
                </PressableSurface>
              </View>
            </View>
          </View>

          <ScrollView
            ref={scroll}
            style={styles.messages}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            // Keep the newest message in view as the conversation grows.
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
            <ChatBubble from="assistant" text={greeting(firstName, rules)} />

            {messages.map((message, index) => {
              // While you edit a question, everything after it fades: Njam
              // will answer again from there.
              const fadedByEdit = editing !== null && index > editing.index;

              if (message.role === 'assistant') {
                return (
                  <View key={message.id} style={[styles.answer, fadedByEdit && styles.faded]}>
                    {message.blocks.map((block, blockIndex) => (
                      <AnswerBlock key={`${message.id}-${blockIndex}`} block={block} rules={rules ?? NO_RULES} />
                    ))}
                    {index === lastAnswer && !busy && !editing && (
                      <View style={styles.replyActions}>
                        <IconButton
                          icon="content_copy"
                          accessibilityLabel="Copy the answer"
                          color={colors.inkMuted}
                          onPress={() => copy(answerText(message))}
                        />
                        <IconButton
                          icon="refresh"
                          accessibilityLabel="Ask again"
                          color={colors.inkMuted}
                          onPress={() => {
                            const question = messages.findLastIndex(
                              (item, at) => at < index && item.role === 'user',
                            );
                            if (question >= 0) askAgainFrom(question, userText(messages[question]));
                          }}
                        />
                      </View>
                    )}
                  </View>
                );
              }

              return (
                <View key={message.id} style={[styles.yours, fadedByEdit && styles.faded]}>
                  <ChatBubble
                    from="user"
                    text={userText(message)}
                    foldAfter={FOLD_AFTER_LINES}
                    faded={message.status === 'failed'}
                    onLongPress={busy ? undefined : (anchor) => setHeld({ index, anchor })}
                  />
                  {message.status === 'failed' && (
                    <View style={styles.statusRow}>
                      <Icon name="cloud_off" size="xs" color={colors.inkMuted} />
                      <Text style={[typography.caption, { color: colors.inkMuted }]}>
                        Did not go through · {timeOf(message.sentAt)}
                      </Text>
                      <Button label="Try again" variant="text" size="small" onPress={() => tryAgain(index)} />
                    </View>
                  )}
                  {message.status === 'stopped' && (
                    <View style={styles.statusRow}>
                      <Text style={[typography.caption, { color: colors.inkMuted }]}>You stopped this answer</Text>
                      <Button
                        label="Ask again"
                        variant="text"
                        size="small"
                        onPress={() => askAgainFrom(index, userText(message))}
                      />
                    </View>
                  )}
                  {editing?.index === index && (
                    <Text style={[typography.caption, { color: colors.inkMuted }]}>
                      Njam will answer again from here
                    </Text>
                  )}
                </View>
              );
            })}

            {(busy || loadingConversation) && (
              <View accessibilityLiveRegion="polite" style={styles.thinking}>
                <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
                <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
                  {busy ? thinkingLine : 'Opening your conversation'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Suggestions, any failure and the composer stay together at the
              foot of the screen, with only a small gap between them. */}
          <View style={styles.footer}>
            {prompts.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                // React Native gives every ScrollView flexGrow: 1, so a
                // horizontal row would stretch to share the screen's height
                // with the messages. 0 keeps it as tall as its chips.
                style={styles.promptRow}
                contentContainerStyle={styles.prompts}>
                {prompts.map((prompt) => (
                  <FilterChip key={prompt} label={prompt} active={false} onPress={() => send(prompt)} />
                ))}
              </ScrollView>
            )}

            {failure && (
              <Snackbar
                kind="failure"
                message={failure.message}
                actionLabel={failure.retryText ? 'Retry' : undefined}
                onAction={failure.retryText ? () => send(failure.retryText as string) : undefined}
                onDismiss={() => setFailure(null)}
              />
            )}

            {copied && <Snackbar message="Copied" onDismiss={() => setCopied(false)} />}

            <ChatComposer
              placeholder="Ask about a product or ingredient"
              onSend={(text) => (editing ? askAgainFrom(editing.index, text) : send(text))}
              busy={busy || loadingConversation}
              onStop={busy ? stop : undefined}
              onChangeText={onChangeText}
              ghost={ghost}
              editing={editing?.text ?? null}
              onCancelEdit={() => setEditing(null)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Exactly as tall as the status bar, as on every other screen. */}
      <FrostedStrip edge="top" height={insets.top} />

      <MenuPopover
        visible={logoAnchor !== null}
        anchor={logoAnchor}
        onClose={() => setLogoAnchor(null)}
        items={[
          { icon: 'add', label: 'New conversation', onPress: startNew },
          { icon: 'history', label: 'Your conversations', onPress: () => setConversationsOpen(true) },
          { icon: 'info', label: 'What Njam can help with', onPress: () => setHelpOpen(true) },
        ]}
      />

      <MenuPopover
        visible={held !== null}
        anchor={held?.anchor ?? null}
        align="end"
        onClose={() => setHeld(null)}
        items={
          held
            ? [
                {
                  icon: 'edit',
                  label: 'Edit your question',
                  onPress: () => setEditing({ index: held.index, text: userText(messages[held.index]) }),
                },
                { icon: 'content_copy', label: 'Copy', onPress: () => copy(userText(messages[held.index])) },
              ]
            : []
        }
      />

      <BottomSheet visible={helpOpen} title="What Njam can help with" onClose={() => setHelpOpen(false)}>
        <View style={styles.helpList}>
          {CAN_HELP_WITH.map((line) => (
            <Text key={line} style={[typography.body, { color: colors.ink }]}>
              {line}
            </Text>
          ))}
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
            Njam explains; your rules decide every verdict. It does not give medical advice, so ask a doctor or
            dietitian about anything to do with your health.
          </Text>
        </View>
      </BottomSheet>

      <ConversationsMenu
        visible={conversationsOpen}
        currentId={conversationId}
        onNew={startNew}
        onOpen={openConversation}
        onClose={() => setConversationsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenGutter,
    gap: space.s3,
  },
  // As tall as the TopBar on every other screen, so the back button sits in
  // the same place. Ask Njam keeps its own header for the logo button.
  header: {
    height: layout.appBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Pull the back button out by the gap between its 48 hit area and its
  // 24 icon, so the icon lines up with the screen gutter (as on Verdict).
  back: {
    marginLeft: -(layout.touchTargetMin - icon.sizeMd) / 2,
  },
  titleLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The 40 logo plus the padding make the whole button taller than the 48
  // target. The right padding gives the pressed wash a pill shape round the words.
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingVertical: space.s1,
    paddingLeft: space.s1,
    paddingRight: space.s3,
    borderRadius: radius.pill,
  },
  messages: {
    flex: 1,
  },
  messageList: {
    gap: space.s3,
    paddingTop: space.s3,
    paddingBottom: space.s3,
  },
  answer: {
    gap: space.s3,
  },
  // Your message and whatever sits under it, on the right.
  yours: {
    alignItems: 'flex-end',
    gap: space.s1,
  },
  faded: {
    opacity: opacity.disabled,
  },
  // Pulled out like the back button, so the first icon lines up with the
  // edge of the answer above it.
  replyActions: {
    flexDirection: 'row',
    marginLeft: -(layout.touchTargetMin - icon.sizeMd) / 2,
    marginTop: -space.s2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  footer: {
    gap: space.s2,
  },
  // The row runs to both screen edges, so chips scroll off the edge of the
  // phone rather than being cut off at the gutter. The first chip still
  // starts on the gutter, thanks to the padding below.
  promptRow: {
    flexGrow: 0,
    marginHorizontal: -layout.screenGutter,
  },
  // A FilterChip is drawn 36 tall but taps at 48. A ScrollView does not pass
  // on touches outside itself, so give the chips that extra room inside it.
  prompts: {
    gap: space.s2,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: (layout.touchTargetMin - layout.filterChipHeight) / 2,
  },
  helpList: {
    gap: space.s3,
  },
});
