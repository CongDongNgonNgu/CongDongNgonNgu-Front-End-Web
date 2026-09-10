import { AiPracticeSection } from './home/AiPracticeSection';
import { ContributionSection } from './home/ContributionSection';
import { ExchangeSection } from './home/ExchangeSection';
import { FinalCtaSection } from './home/FinalCtaSection';
import { HeroSection } from './home/HeroSection';
import { LanguagesSection } from './home/LanguagesSection';
import { LearningLoopSection } from './home/LearningLoopSection';
import { LibrarySection } from './home/LibrarySection';
import { MembershipSection } from './home/MembershipSection';
import { WorldSection } from './home/WorldSection';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.homePage}>
      <HeroSection />
      <LanguagesSection />
      <LearningLoopSection />
      <ExchangeSection />
      <AiPracticeSection />
      <LibrarySection />
      <WorldSection />
      <ContributionSection />
      <MembershipSection />
      <FinalCtaSection />
    </div>
  );
}
