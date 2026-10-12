/**
 * Search: the catalogue search on its own tab, without Home's scan button.
 */
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/design-system';
import { AskNjamHeader } from '@/features/ask-njam/AskNjamHeader';
import { ProductSearch } from '@/features/home/ProductSearch';

export function SearchScreen() {
  return (
    <Screen withTabBar>
      <AskNjamHeader>
        <SectionHeader headline="Find a product" deck="Search by product name or brand." />
      </AskNjamHeader>
      <ProductSearch />
    </Screen>
  );
}
