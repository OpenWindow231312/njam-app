/**
 * Settings tab on Profile: scanning, notifications, privacy and display,
 * then Delete my account and Log out.
 *
 * Two kinds of setting, saved in two places:
 *   - This phone (flashlight, vibration): src/lib/device-settings.ts.
 *   - Your account (notifications, privacy): user_settings, through
 *     account-settings.ts, so they follow you to another phone.
 *
 * A switch moves as soon as it is tapped and saves in the background. If the
 * save fails, it moves back and a snackbar says so.
 *
 * Rows for things Njam cannot do yet are shown greyed out with "Coming
 * soon", so the screen matches the design without promising what is not built.
 */
import { useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Share, StyleSheet, Text, View } from 'react-native';

import {
  BottomSheet,
  Button,
  ConfirmDialog,
  FilterChip,
  ListGroup,
  ListRow,
  OptionButton,
  Snackbar,
} from '@/components/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  DEFAULT_ACCOUNT_SETTINGS,
  fetchAccountSettings,
  saveAccountSettings,
  type AccountSettings,
} from '@/features/profile/account-settings';
import { collectMyData, deleteMyAccount } from '@/features/profile/my-data';
import { CardBlock, SettingsCard } from '@/features/profile/SettingsCard';
import { setDeviceSetting, useDeviceSettings } from '@/lib/device-settings';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Message = { kind: 'neutral' | 'failure'; text: string };

/** The quiet hours you can pick. Off is both times null. */
const QUIET_HOURS: { from: string | null; until: string | null }[] = [
  { from: null, until: null },
  { from: '21:00', until: '07:00' },
  { from: '22:00', until: '06:00' },
  { from: '23:00', until: '07:00' },
];

function quietLabel(from: string | null, until: string | null): string {
  return from && until ? `${from} to ${until}` : 'Off';
}

export function SettingsTab() {
  const { colors } = useNjamTheme();
  const { session, member, signOut } = useAuth();
  const device = useDeviceSettings();
  const [camera] = useCameraPermissions();
  const [account, setAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT_SETTINGS);
  const [quietOpen, setQuietOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<'download' | 'delete' | 'logout' | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const memberId = member?.id;
  const load = useCallback(() => {
    if (!memberId) return;
    fetchAccountSettings(memberId)
      .then(setAccount)
      .catch(() => setMessage({ kind: 'failure', text: 'We could not load your settings. Check your connection.' }));
  }, [memberId]);
  useFocusEffect(load);

  async function changeAccount(change: Partial<AccountSettings>) {
    if (!memberId) return;
    const before = account;
    const next = { ...account, ...change };
    setAccount(next);
    try {
      await saveAccountSettings(memberId, next);
    } catch {
      setAccount(before);
      setMessage({ kind: 'failure', text: 'We could not save that setting. Check your connection.' });
    }
  }

  async function downloadMyData() {
    if (!memberId) return;
    setBusy('download');
    try {
      const data = await collectMyData(memberId, session?.user.email);
      // The phone's share sheet: save it to Files, mail it, or send it on.
      await Share.share({ title: 'My Njam data', message: data });
    } catch {
      setMessage({ kind: 'failure', text: 'We could not gather your data. Check your connection.' });
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setConfirmingDelete(false);
    setBusy('delete');
    try {
      const result = await deleteMyAccount();
      if (result === 'hand-over-first') {
        setMessage({ kind: 'failure', text: 'Hand over your household on the Household tab first.' });
        setBusy(null);
        return;
      }
      // The login is gone; signing out clears it from this phone too.
      await signOut();
    } catch {
      setMessage({ kind: 'failure', text: 'We could not delete your account. Try again.' });
      setBusy(null);
    }
  }

  async function logOut() {
    setBusy('logout');
    try {
      await signOut();
      // The root layout sees the session end and shows the Auth screen.
    } catch {
      setBusy(null);
      setMessage({ kind: 'failure', text: 'We could not reach Njam. Check your connection.' });
    }
  }

  return (
    <View style={styles.tab}>
      <SettingsCard title="Scanning" caption="How the scanner behaves on this phone" icon="barcode_scanner">
        <CardBlock>
          <Text style={[typography.title, { color: colors.ink }]}>Flashlight when the scanner opens</Text>
          <View style={styles.chips}>
            <FilterChip label="Off" active={device.flashlight === 'off'} onPress={() => setDeviceSetting('flashlight', 'off')} />
            <FilterChip label="On" active={device.flashlight === 'on'} onPress={() => setDeviceSetting('flashlight', 'on')} />
          </View>
        </CardBlock>
        <ListRow
          title="Vibrate when something works"
          supporting="A scan, a save, a product added"
          trailing="switch"
          switchValue={device.vibrate}
          onSwitchChange={(on) => setDeviceSetting('vibrate', on)}
        />
        <ListRow title="Play a sound" supporting="Coming soon" trailing="none" disabled />
        <ListRow
          title="Check for the whole household"
          supporting="Coming soon. For now, pick a person on the verdict."
          trailing="none"
          disabled
        />
        <ListRow title="Keep the camera open after a scan" supporting="Coming soon" trailing="none" disabled />
      </SettingsCard>

      <SettingsCard
        title="Notifications"
        caption="Saved to your account. Njam starts sending these once alerts go live."
        icon="notifications">
        <ListRow
          title="Product recalls"
          supporting="When a product you saved or scanned is recalled"
          trailing="switch"
          switchValue={account.notifyRecalls}
          onSwitchChange={(on) => changeAccount({ notifyRecalls: on })}
        />
        <ListRow
          title="Label changes"
          supporting="When a saved product's ingredients change"
          trailing="switch"
          switchValue={account.notifyLabelChanges}
          onSwitchChange={(on) => changeAccount({ notifyLabelChanges: on })}
        />
        <ListRow
          title="Household changes"
          supporting="When someone edits a rule or joins"
          trailing="switch"
          switchValue={account.notifyHousehold}
          onSwitchChange={(on) => changeAccount({ notifyHousehold: on })}
        />
        <ListRow
          title="Weekly summary"
          trailing="switch"
          switchValue={account.notifyWeeklySummary}
          onSwitchChange={(on) => changeAccount({ notifyWeeklySummary: on })}
        />
        <ListRow
          title="Quiet hours"
          value={quietLabel(account.quietFrom, account.quietUntil)}
          onPress={() => setQuietOpen(true)}
        />
      </SettingsCard>

      <SettingsCard title="Privacy and data" caption="Your rules and scans stay in your household" icon="lock">
        <ListRow
          title="Keep my scan history"
          supporting="Off: new scans are not saved. Only your household can see it."
          trailing="switch"
          switchValue={account.keepScanHistory}
          onSwitchChange={(on) => changeAccount({ keepScanHistory: on })}
        />
        <ListRow
          title="Help improve Njam"
          supporting="Once this launches, share scans without your name so labels get verified faster"
          trailing="switch"
          switchValue={account.helpImprove}
          onSwitchChange={(on) => changeAccount({ helpImprove: on })}
        />
        <ListRow
          title="Camera access"
          supporting="Change it in your phone's settings"
          value={camera?.granted ? 'Allowed' : 'Not allowed'}
          onPress={() => Linking.openSettings()}
        />
        <ListRow
          title="Download my data"
          supporting="Your rules, scans, saves and settings"
          disabled={busy === 'download'}
          onPress={downloadMyData}
        />
      </SettingsCard>

      <SettingsCard title="Display" icon="visibility">
        <ListRow
          title="Text size"
          supporting="Coming soon. Njam follows your phone's text size for now."
          trailing="none"
          disabled
        />
        <ListRow
          title="Reduce motion"
          supporting="Coming soon. Njam follows your phone's setting for now."
          trailing="none"
          disabled
        />
      </SettingsCard>

      {/* Only an admin sees the way in. The database still refuses a
          verification from anyone else (see admin-review/review-queue.ts). */}
      {member?.role === 'admin' && (
        <ListGroup>
          <ListRow
            title="Review queue"
            supporting="Verify products shoppers added or Njam read from a label"
            icon="admin_panel_settings"
            iconBadge="strong"
            onPress={() => router.push('/admin-review')}
          />
        </ListGroup>
      )}

      <View style={styles.actions}>
        <Button
          label="Delete my account"
          icon="delete"
          variant="danger"
          loading={busy === 'delete'}
          loadingLabel="Deleting your account"
          onPress={() => setConfirmingDelete(true)}
          fullWidth
        />
        <Button
          label="Log out"
          icon="logout"
          variant="outlined"
          loading={busy === 'logout'}
          loadingLabel="Logging you out"
          onPress={logOut}
          fullWidth
        />
      </View>

      <BottomSheet
        visible={quietOpen}
        title="Quiet hours"
        subtitle="No notifications between these times"
        onClose={() => setQuietOpen(false)}>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {QUIET_HOURS.map((hours) => (
            <OptionButton
              key={quietLabel(hours.from, hours.until)}
              label={quietLabel(hours.from, hours.until)}
              selected={account.quietFrom === hours.from && account.quietUntil === hours.until}
              onPress={() => {
                setQuietOpen(false);
                changeAccount({ quietFrom: hours.from, quietUntil: hours.until });
              }}
            />
          ))}
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={confirmingDelete}
        icon="delete"
        title="Delete your account?"
        body="Your rules, scans, saves and settings go too. This cannot be undone."
        cancelLabel="Keep my account"
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={deleteAccount}
      />

      {message && <Snackbar kind={message.kind} message={message.text} onDismiss={() => setMessage(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    gap: space.s6,
  },
  chips: {
    flexDirection: 'row',
    gap: space.s2,
  },
  options: {
    gap: space.s2,
  },
  actions: {
    gap: space.s3,
  },
});
