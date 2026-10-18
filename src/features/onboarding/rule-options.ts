/**
 * The choices offered when you set your rules: which allergens, diets,
 * ingredients and E-numbers to suggest, and the three allergy levels.
 *
 * Shared by onboarding and the Rules tab on Profile, so both always offer
 * the same things and a new allergen only has to be added here.
 */
import type { AllergySeverity } from '@/features/onboarding/my-rules';

/** The eight allergens R146 makes a label declare, as seeded in the allergens table. */
export const ALLERGENS = ['milk', 'egg', 'peanut', 'tree-nut', 'soy', 'gluten', 'fish', 'crustacean-mollusc'];

/** Each diet and the allergens it rules out. Only diets the engine can fully check belong here. */
export const DIETS: { label: string; allergens: string[] }[] = [
  { label: 'Gluten-free', allergens: ['gluten'] },
  { label: 'Dairy-free', allergens: ['milk'] },
  { label: 'Egg-free', allergens: ['egg'] },
  { label: 'Nut-free', allergens: ['peanut', 'tree-nut'] },
];

/**
 * Suggestions are ingredients the catalogue already knows by these names,
 * so a rule made from one is sure to match a label. Anything else can be
 * typed in.
 */
export const SUGGESTED_INGREDIENTS = ['palm oil', 'sugar', 'caffeine', 'cocoa', 'coconut', 'maize', 'onion', 'garlic'];

export const SUGGESTED_E_NUMBERS: { code: string; name: string }[] = [
  { code: 'E621', name: 'MSG' },
  { code: 'E211', name: 'sodium benzoate' },
  { code: 'E202', name: 'potassium sorbate' },
  { code: 'E282', name: 'calcium propionate' },
  { code: 'E150D', name: 'caramel colour' },
  { code: 'E322', name: 'lecithin' },
];

/** E100 to E1521, with an optional letter: E150d, E160a. */
export const E_NUMBER_PATTERN = /^E\d{3,4}[A-Z]?$/;

export const SEVERITY_CHOICES: { value: AllergySeverity; label: string }[] = [
  { value: null, label: 'Avoid' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];
