/**
 * Your conversations: the full-screen list of past Ask Njam chats, opened
 * by tapping "Ask Njam" at the top of the chat, as in ChatGPT or Claude.
 *
 * It covers the whole screen on the page's `surface`, so it needs no shadow
 * (it does not float above anything). A close button and the title lead,
 * then "Start a new conversation", then your chats in white ListGroups under
 * small date labels: Today, Yesterday, Earlier. The one on screen says
 * "Open now".
 */
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, ListGroup, ListRow, LoadingMark } from '@/components/design-system';
import { fetchConversations, type Conversation } from '@/features/ask-njam/conversations';
import { icon, layout, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ConversationsMenuProps = {
  visible: boolean;
  /** The conversation on screen, so its row can say so. */
  currentId: string | null;
  onNew: () => void;
  onOpen: (conversationId: string) => void;
  onClose: () => void;
};

type Loaded = { kind: 'loading' } | { kind: 'shown'; conversations: Conversation[] } | { kind: 'failed' };

type Group = { label: string; conversations: Conversation[] };

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/**
 * Splits the list (already newest first) into Today, Yesterday and Earlier.
 * An empty group is left out.
 */
function groupByDay(conversations: Conversation[]): Group[] {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const groups: Group[] = [
    { label: 'Today', conversations: [] },
    { label: 'Yesterday', conversations: [] },
    { label: 'Earlier', conversations: [] },
  ];
  for (const conversation of conversations) {
    const used = new Date(conversation.updatedAt);
    const index = sameDay(used, today) ? 0 : sameDay(used, yesterday) ? 1 : 2;
    groups[index].conversations.push(conversation);
  }
  return groups.filter((group) => group.conversations.length > 0);
}

/** "14:05" for today and yesterday, where the label already gives the day; "9 Oct" before that. */
function lastUsed(iso: string, label: string): string {
  const date = new Date(iso);
  return label === 'Earlier'
    ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function ConversationsMenu({ visible, currentId, onNew, onOpen, onClose }: ConversationsMenuProps) {
  const { colors } = useNjamTheme();
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });

  // Read the list fresh each time it opens, so a conversation just started is in it.
  useEffect(() => {
    if (!visible) return;
    setLoaded({ kind: 'loading' });
    fetchConversations()
      .then((conversations) => setLoaded({ kind: 'shown', conversations }))
      .catch(() => setLoaded({ kind: 'failed' }));
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { backgroundColor: colors.surface }]}>
        <ScrollView
          contentContainerStyle={[
            styles.column,
            { paddingTop: insets.top + space.s2, paddingBottom: insets.bottom + space.s8 },
          ]}>
          <View style={styles.titleRow}>
            <View style={styles.close}>
              <IconButton icon="close" accessibilityLabel="Close your conversations" onPress={onClose} />
            </View>
            <Text accessibilityRole="header" style={[typography.headline, { color: colors.ink }]}>
              Your conversations
            </Text>
          </View>

          <Button label="Start a new conversation" icon="add" fullWidth onPress={onNew} />

          {loaded.kind === 'loading' && (
            <View style={styles.status}>
              <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
              <Text style={[typography.body, { color: colors.inkMuted }]}>Finding your conversations</Text>
            </View>
          )}

          {loaded.kind === 'failed' && (
            <Text style={[typography.body, { color: colors.inkMuted }]}>
              We could not load your conversations. Check your connection.
            </Text>
          )}

          {loaded.kind === 'shown' && loaded.conversations.length === 0 && (
            <Text style={[typography.body, { color: colors.inkMuted }]}>
              Every conversation you have with Njam is kept here.
            </Text>
          )}

          {loaded.kind === 'shown' &&
            groupByDay(loaded.conversations).map((group) => (
              <View key={group.label} style={styles.group}>
                <Text accessibilityRole="header" style={[typography.label, { color: colors.inkMuted }]}>
                  {group.label}
                </Text>
                <ListGroup>
                  {group.conversations.map((conversation) => (
                    <ListRow
                      key={conversation.id}
                      title={conversation.title}
                      supporting={
                        conversation.id === currentId
                          ? `Open now · ${lastUsed(conversation.updatedAt, group.label)}`
                          : lastUsed(conversation.updatedAt, group.label)
                      }
                      trailing="chevron"
                      onPress={() => onOpen(conversation.id)}
                    />
                  ))}
                </ListGroup>
              </View>
            ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenGutter,
    gap: space.s6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
  },
  // Pull the close button out so its 24 icon lines up with the gutter.
  close: {
    marginLeft: -(layout.touchTargetMin - icon.sizeMd) / 2,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  group: {
    gap: space.s2,
  },
});
