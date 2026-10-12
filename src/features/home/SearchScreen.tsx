/**
 * Search: the catalogue search on its own tab, without Home's scan button.
 */
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/design-system';
import { ProductSearch } from '@/features/home/ProductSearch';

export function SearchScreen() {
  return (
    <Screen withTabBar>
      <SectionHeader headline="Find a product" deck="Search by product name or brand." />
      <ProductSearch />
    </Screen>
  );
}
