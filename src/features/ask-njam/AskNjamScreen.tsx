/**
 * Ask Njam: the assistant. Recipes with a product you scanned, why something
 * got its verdict, what an ingredient or E-number is, and what to eat instead.
 *
 * Layout, from the "Njam UI v1.4" canvas (Assistant board):
 *   header   - AiAvatar, "Ask Njam", "Answers use your rules", and the more
 *              menu (new conversation, past conversations). A back button
 *              leads, because this is a Stack screen like Verdict.
 *   messages - ChatBubbles: a greeting, then the conversation.
 *   bottom   - follow-up suggestions as chips, then the ChatComposer.
 *
 * What the screen does not do: decide anything. Njam's words come from the
 * ask-njam edge function, which saves the conversation; every verdict chip
 * comes from the verdict engine (AnswerBlocks.tsx).
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AiAvatar,
  ChatBubble,
  ChatComposer,
  FilterChip,
  FrostedStrip,
  IconButton,
  LoadingMark,
  Snackbar,
} from '@/components/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { AnswerBlock } from '@/features/ask-njam/AnswerBlocks';
import { fetchMessages, type ChatMessage } from '@/features/ask-njam/conversations';
import { ConversationsMenu } from '@/features/ask-njam/ConversationsMenu';
import { useGhostText } from '@/features/ask-njam/use-ghost-text';
import { fetchActiveProfile } from '@/features/profile/active-profile';
import { AskNjamError, askNjam } from '@/services/ai';
import { allergenWord, type ProfileRule } from '@/services/verdict';
import { icon, layout, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

// A stable empty list, so the answer blocks do not reload on every render.
const NO_RULES: ProfileRule[] = [];

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

type Failure = { message: string; retryText: string | null };

export function AskNjamScreen() {
  const { colors } = useNjamTheme();
  const insets = useSafeAreaInsets();
  const { member } = useAuth();
  const { ghost, onChangeText } = useGhostText();

  const [rules, setRules] = useState<ProfileRule[] | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const scroll = useRef<ScrollView>(null);
  // Bumped whenever a different conversation is put on screen. An answer
  // that comes back for the old one is then dropped, not mixed in.
  const shownConversation = useRef(0);

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

  // The latest answer's suggestions, or starters for an empty conversation.
  const prompts = useMemo(() => {
    if (busy || loadingConversation) return [];
    const last = messages.at(-1);
    if (!last) return starterPrompts(rules);
    if (last.role !== 'assistant') return [];
    const block = last.blocks.find((item) => item.type === 'suggestions');
    return block && block.type === 'suggestions' ? block.prompts : [];
  }, [busy, loadingConversation, messages, rules]);

  function send(text: string) {
    if (busy) return;
    const asked = shownConversation.current;
    // Shown straight away; replaced by nothing if Njam fails, because the
    // function saves the question only together with its answer.
    const pending: ChatMessage = { id: `pending-${Date.now()}`, role: 'user', blocks: [{ type: 'text', text }] };
    setMessages((current) => [...current, pending]);
    setFailure(null);
    setBusy(true);

    askNjam(text, conversationId)
      .then((answer) => {
        if (shownConversation.current !== asked) return;
        setConversationId(answer.conversationId);
        setMessages((current) => [
          ...current,
          { id: `answer-${Date.now()}`, role: 'assistant', blocks: answer.blocks },
        ]);
      })
      .catch((error) => {
        if (shownConversation.current !== asked) return;
        setMessages((current) => current.filter((message) => message.id !== pending.id));
        setFailure({
          message: error instanceof AskNjamError ? error.message : 'Njam could not answer that. Try again.',
          retryText: text,
        });
      })
      .finally(() => {
        // startNew and openConversation already cleared busy for the old one.
        if (shownConversation.current === asked) setBusy(false);
      });
  }

  function startNew() {
    shownConversation.current += 1;
    setMenuOpen(false);
    setConversationId(null);
    setMessages([]);
    setFailure(null);
    setBusy(false);
  }

  function openConversation(id: string) {
    shownConversation.current += 1;
    const opening = shownConversation.current;
    setMenuOpen(false);
    setConversationId(id);
    setMessages([]);
    setFailure(null);
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

  return (
    <View style={[styles.page, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.column, { paddingTop: insets.top + space.s2, paddingBottom: keyboardOpen ? space.s2 : insets.bottom + space.s4 }]}>
          <View style={styles.header}>
            <View style={styles.back}>
              <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={() => router.back()} />
            </View>
            <AiAvatar />
            <View style={styles.titles}>
              <Text accessibilityRole="header" style={[typography.headline, { color: colors.ink }]}>
                Ask Njam
              </Text>
              <Text style={[typography.bodyS, { color: colors.inkMuted }]}>Answers use your rules</Text>
            </View>
            <IconButton
              icon="more_horiz"
              variant="tonal"
              accessibilityLabel="Conversations"
              onPress={() => setMenuOpen(true)}
            />
          </View>

          <ScrollView
            ref={scroll}
            style={styles.messages}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            // Keep the newest message in view as the conversation grows.
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
            <ChatBubble from="assistant" text={greeting(firstName, rules)} />

            {messages.map((message) =>
              message.role === 'user' ? (
                <ChatBubble key={message.id} from="user" text={userText(message)} />
              ) : (
                message.blocks.map((block, index) => (
                  <AnswerBlock key={`${message.id}-${index}`} block={block} rules={rules ?? NO_RULES} />
                ))
              ),
            )}

            {(busy || loadingConversation) && (
              <View accessibilityLiveRegion="polite" style={styles.thinking}>
                <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
                <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
                  {busy ? 'Njam is thinking it over' : 'Opening your conversation'}
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

            <ChatComposer
              placeholder="Ask about a product or ingredient"
              onSend={send}
              busy={busy || loadingConversation}
              onChangeText={onChangeText}
              ghost={ghost}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Exactly as tall as the status bar, as on every other screen. */}
      <FrostedStrip edge="top" height={insets.top} />

      <ConversationsMenu
        visible={menuOpen}
        currentId={conversationId}
        onNew={startNew}
        onOpen={openConversation}
        onClose={() => setMenuOpen(false)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  // Pull the back button out by the gap between its 48 hit area and its
  // 24 icon, so the icon lines up with the screen gutter (as on Verdict).
  back: {
    marginLeft: -(layout.touchTargetMin - icon.sizeMd) / 2,
  },
  titles: {
    flex: 1,
  },
  messages: {
    flex: 1,
  },
  messageList: {
    gap: space.s3,
    paddingTop: space.s3,
    paddingBottom: space.s3,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  footer: {
    gap: space.s2,
  },
  promptRow: {
    flexGrow: 0,
  },
  // A FilterChip is drawn 36 tall but taps at 48. A ScrollView does not pass
  // on touches outside itself, so give the chips that extra room inside it.
  prompts: {
    gap: space.s2,
    paddingVertical: (layout.touchTargetMin - layout.filterChipHeight) / 2,
  },
});
