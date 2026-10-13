import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';

/** First run, straight after sign-up. */
export default function Onboarding() {
  return <OnboardingScreen mode="first-run" />;
}
