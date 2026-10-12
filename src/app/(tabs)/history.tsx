import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/design-system';

// Placeholder until the History screen is built.
export default function Placeholder() {
  return (
    <Screen withTabBar>
      <EmptyState variant="screen" icon="info" headline="History is next" body="This screen is being built." />
    </Screen>
  );
}
