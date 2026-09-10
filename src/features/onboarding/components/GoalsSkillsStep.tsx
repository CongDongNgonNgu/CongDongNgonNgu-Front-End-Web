import { Icon } from '../../../components/ui/Icon/Icon';
import { GOAL_OPTIONS, SKILL_OPTIONS } from '../onboarding.constants';
import type { OnboardingDraft, ProfileSkill } from '../onboarding.types';
import styles from './GoalsSkillsStep.module.css';

interface GoalsSkillsStepProps {
  draft: OnboardingDraft;
  searchId: string;
  onToggleGoal: (value: string) => void;
  onToggleSkill: (value: ProfileSkill) => void;
}

export function GoalsSkillsStep({ draft, searchId, onToggleGoal, onToggleSkill }: GoalsSkillsStepProps) {
  return (
    <section className={styles.goalsSection} aria-labelledby='goals-section-title'>
      <div className={styles.sectionIntro}>
        <p className={styles.sectionEyebrow}>CÁ NHÂN HÓA GỢI Ý</p>
        <h2 id='goals-section-title'>Điều gì đưa bạn đến đây?</h2>
        <p>Chọn ít nhất một mục tiêu và một kỹ năng. Bạn có thể thay đổi những lựa chọn này sau.</p>
      </div>
      <fieldset className={styles.optionFieldset}>
        <legend>Mục tiêu của bạn</legend>
        <div className={styles.goalGrid}>
          {GOAL_OPTIONS.map((goal) => {
            const selected = draft.goals.includes(goal.value);
            const goalLabelId = `${searchId}-goal-${goal.value}-label`;
            const goalActionId = `${searchId}-goal-${goal.value}-action`;
            return (
              <button
                className={`${styles.goalChoice} ${selected ? styles.goalChoiceSelected : ''}`}
                type='button'
                key={goal.value}
                aria-pressed={selected}
                aria-labelledby={goalLabelId}
                aria-describedby={goalActionId}
                data-onboarding-error-target={selected ? undefined : 'true'}
                onClick={() => onToggleGoal(goal.value)}
              >
                <span id={goalLabelId}>
                  <strong>{goal.label}</strong>
                  <small>{goal.description}</small>
                </span>
                <span id={goalActionId} className={styles.srOnly}>{selected ? 'Đã chọn' : 'Chọn'} mục tiêu</span>
                <span className={styles.checkIndicator} aria-hidden='true'>{selected ? <Icon name='check-circle' size={18} /> : null}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={styles.optionFieldset}>
        <legend>Kỹ năng bạn muốn luyện tập</legend>
        <div className={styles.skillGrid}>
          {SKILL_OPTIONS.map((skill) => {
            const selected = draft.skills.includes(skill.value);
            const skillLabelId = `${searchId}-skill-${skill.value}-label`;
            const skillActionId = `${searchId}-skill-${skill.value}-action`;
            return (
              <button
                className={`${styles.skillChoice} ${selected ? styles.skillChoiceSelected : ''}`}
                type='button'
                key={skill.value}
                aria-pressed={selected}
                aria-labelledby={skillLabelId}
                aria-describedby={skillActionId}
                data-onboarding-error-target={selected ? undefined : 'true'}
                onClick={() => onToggleSkill(skill.value)}
              >
                <span id={skillLabelId}>{skill.label}</span>
                <span id={skillActionId} className={styles.srOnly}>{selected ? 'Đã chọn' : 'Chọn'} kỹ năng</span>
                {selected ? <Icon name='check-circle' size={18} /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
