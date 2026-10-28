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

/**
 * Each level and what it does, in the words onboarding shows. Every level blocks a product that contains the allergen; Avoid and Moderate are checked the same way, and only Severe changes a verdict as well (an unchecked ingredient list can never be Safe).
 */
export const SEVERITY_CHOICES: { value: AllergySeverity; label: string; meaning: string }[] = [
  { value: null, label: 'Avoid', meaning: 'Any product that lists it comes back Not safe.' },
  {
    value: 'moderate',
    label: 'Moderate',
    meaning: 'Checked the same way as Avoid. It tells your household to take more care.',
  },
  {
    value: 'severe',
    label: 'Severe',
    meaning: 'Even a trace is dangerous. A product our team has not checked can never be Safe for you.'
  },
];

/**
 * One thing a diet or faith rules out, as the rules the engine checks:
 * ingredient names (matched as whole words, so "pork" finds "pork fat"),
 * E-numbers, and allergens. An allergen added by a diet is saved as "Avoid",
 * and never lowers a level you set yourself.
 */
export type DietItem = {
  key: string;
  label: string;
  ingredients: string[];
  eNumbers: string[];
  allergens: string[];
};

export type DietPreset = {
  /** Saved as the target of the diet's rows: "halaal". */
  key: string;
  label: string;
  items: DietItem[];
  /** What the ingredient list cannot tell you, said plainly in the sheet. */
  limits: string;
};

const ITEMS = {
  pork: { key: 'pork', label: 'Pork, bacon, ham and lard', ingredients: ['pork', 'bacon', 'ham', 'lard'], eNumbers: [], allergens: [] },
  meat: {
    key: 'meat',
    label: 'Meat and poultry',
    ingredients: ['beef', 'pork', 'bacon', 'ham', 'chicken', 'lamb', 'mutton', 'veal', 'turkey', 'meat'],
    eNumbers: [],
    allergens: [],
  },
  fish: { key: 'fish', label: 'Fish and shellfish', ingredients: ['anchovy', 'tuna'], eNumbers: [], allergens: ['fish', 'crustacean-mollusc'] },
  shellfish: { key: 'shellfish', label: 'Shellfish', ingredients: [], eNumbers: [], allergens: ['crustacean-mollusc'] },
  gelatine: { key: 'gelatine', label: 'Gelatine (E441)', ingredients: ['gelatine', 'gelatin'], eNumbers: ['E441'], allergens: [] },
  animalFat: { key: 'animal-fat', label: 'Lard, tallow and suet', ingredients: ['lard', 'tallow', 'suet', 'dripping'], eNumbers: [], allergens: [] },
  rennet: { key: 'rennet', label: 'Rennet', ingredients: ['rennet'], eNumbers: [], allergens: [] },
  alcohol: {
    key: 'alcohol',
    label: 'Alcohol',
    ingredients: ['alcohol', 'ethanol', 'rum', 'brandy', 'sherry', 'liqueur'],
    eNumbers: [],
    allergens: [],
  },
  carmine: { key: 'carmine', label: 'Carmine, a red colour from insects (E120)', ingredients: ['carmine', 'cochineal'], eNumbers: ['E120'], allergens: [] },
  cysteine: { key: 'l-cysteine', label: 'L-cysteine, often from feathers (E920)', ingredients: ['l-cysteine'], eNumbers: ['E920'], allergens: [] },
  milk: { key: 'milk', label: 'Milk', ingredients: [], eNumbers: [], allergens: ['milk'] },
  egg: { key: 'egg', label: 'Eggs', ingredients: [], eNumbers: [], allergens: ['egg'] },
  honey: { key: 'honey', label: 'Honey', ingredients: ['honey'], eNumbers: [], allergens: [] },
} satisfies Record<string, DietItem>;

/**
 * Diets and faiths, offered as shortcuts. The engine cannot check a diet as
 * such (that needs every ingredient tagged with where it comes from), so each
 * one is the list of things it rules out, and you untick what you are fine with.
 */
export const DIET_PRESETS: DietPreset[] = [
  {
    key: 'vegetarian',
    label: 'Vegetarian',
    items: [ITEMS.meat, ITEMS.fish, ITEMS.gelatine, ITEMS.animalFat, ITEMS.rennet],
    limits: 'We read the ingredient list. A vague word like "flavouring" can still hide an animal ingredient.',
  },
  {
    key: 'vegan',
    label: 'Vegan',
    items: [ITEMS.meat, ITEMS.fish, ITEMS.milk, ITEMS.egg, ITEMS.honey, ITEMS.gelatine, ITEMS.animalFat, ITEMS.carmine],
    limits: 'We read the ingredient list. A vague word like "flavouring" can still hide an animal ingredient.',
  },
  {
    key: 'halaal',
    label: 'Halaal',
    items: [ITEMS.pork, ITEMS.gelatine, ITEMS.alcohol, ITEMS.carmine, ITEMS.cysteine],
    limits: 'We read the ingredient list. We cannot tell how meat was slaughtered, so look for a halaal mark too.',
  },
  {
    key: 'kosher',
    label: 'Kosher',
    items: [ITEMS.pork, ITEMS.shellfish, ITEMS.gelatine, ITEMS.carmine],
    limits: 'We read the ingredient list. We cannot check certification or meat and milk eaten together, so look for a kosher mark too.',
  },
];

/**
 * A nutrient you can set a limit on, per 100 g. `target` is the word the
 * engine reads, `low` is where the slider starts and the first quick pick.
 */
export type NutrientOption = {
  target: string;
  label: string;
  unit: 'g' | 'mg';
  max: number;
  step: number;
  /** Quick picks under the slider, with what each one means. */
  picks: { value: number; meaning: string }[];
  hint?: string;
};

export const NUTRIENT_OPTIONS: NutrientOption[] = [
  {
    target: 'sugar',
    label: 'Sugar',
    unit: 'g',
    max: 50,
    step: 0.5,
    picks: [
      { value: 5, meaning: 'low' },
      { value: 22.5, meaning: 'high' },
    ],
  },
  {
    target: 'sodium',
    label: 'Sodium',
    unit: 'mg',
    max: 2000,
    step: 10,
    picks: [
      { value: 120, meaning: 'low' },
      { value: 600, meaning: 'high' },
    ],
    hint: 'Labels list salt as sodium.',
  },
  {
    target: 'saturated fat',
    label: 'Saturated fat',
    unit: 'g',
    max: 20,
    step: 0.5,
    picks: [
      { value: 1.5, meaning: 'low' },
      { value: 5, meaning: 'high' },
    ],
  },
  {
    target: 'fat',
    label: 'Fat',
    unit: 'g',
    max: 50,
    step: 0.5,
    picks: [
      { value: 3, meaning: 'low' },
      { value: 17.5, meaning: 'high' },
    ],
  },
  {
    target: 'carbs',
    label: 'Carbs',
    unit: 'g',
    max: 100,
    step: 1,
    picks: [
      { value: 10, meaning: 'low' },
      { value: 30, meaning: 'moderate' },
    ],
  },
];

/** Health presets: a few limits set in one tap. Every one is a starting point, not medical advice. */
export const NUTRIENT_PRESETS: { label: string; limits: Record<string, number> }[] = [
  { label: 'Low sugar', limits: { sugar: 5 } },
  { label: 'Low salt', limits: { sodium: 120 } },
  { label: 'Low fat', limits: { fat: 3 } },
  { label: 'Heart health', limits: { 'saturated fat': 1.5, sodium: 120 } },
];
