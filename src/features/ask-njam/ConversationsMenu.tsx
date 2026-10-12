/**
 * The Ask Njam "more" menu: start a new conversation, or reopen a saved one.
 *
 * A modal over the scrim, built like ConfirmDialog (radius.xl, the modal
 * shadow: modals are one of the three places Njam allows elevation). Its
 * ground is `surface`, not white, so the white ListGroup of conversations
 * inside it reads as a card, as it does on every page. Tapping outside
 * closes it, because closing loses nothing.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, ListGroup, ListRow, LoadingMark } from '@/components/design-system';
import { fetchConversations, type Conversation } from '@/features/ask-njam/conversations';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
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

function lastUsed(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function ConversationsMenu({ visible, currentId, onNew, onOpen, onClose }: ConversationsMenuProps) {
  const { colors, shadows } = useNjamTheme();
  const { height } = useWindowDimensions();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });

  // Read the list fresh each time the menu opens, so a conversation just
  // started is in it.
  useEffect(() => {
    if (!visible) return;
    setLoaded({ kind: 'loading' });
    fetchConversations()
      .then((conversations) => setLoaded({ kind: 'shown', conversations }))
      .catch(() => setLoaded({ kind: 'failed' }));
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: colors.surfaceScrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />

        <View
          accessibilityViewIsModal
          // As tall as an expanded sheet may be, at most.
          style={[
            styles.card,
            { backgroundColor: colors.surface, maxHeight: height * layout.sheetMaxHeight },
            shadows.modal,
          ]}>
          <Text accessibilityRole="header" style={[typography.displayM, { color: colors.ink }]}>
            Your conversations
          </Text>

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

          {loaded.kind === 'shown' && loaded.conversations.length > 0 && (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              <ListGroup>
                {loaded.conversations.map((conversation) => (
                  <ListRow
                    key={conversation.id}
                    title={conversation.title}
                    supporting={
                      conversation.id === currentId
                        ? `Open now · ${lastUsed(conversation.updatedAt)}`
                        : lastUsed(conversation.updatedAt)
                    }
                    icon="history"
                    iconBadge="soft"
                    trailing="chevron"
                    onPress={() => onOpen(conversation.id)}
                  />
                ))}
              </ListGroup>
            </ScrollView>
          )}

          <Button label="Close" variant="text" fullWidth onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenGutter,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    gap: space.s4,
    padding: space.s6,
    borderRadius: radius.xl,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  // Shrinks to fit inside the card's height cap and scrolls the rest.
  list: {
    flexShrink: 1,
  },
  // Room for the ListGroup's ambient shadow, which the ScrollView would clip.
  listContent: {
    padding: space.s1,
  },
});
