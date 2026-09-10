import { Icon } from '../../components/ui/Icon/Icon';
import { loopSteps } from './home.constants';
import shared from './HomeShared.module.css';
import styles from './LearningLoopSection.module.css';

export function LearningLoopSection() {
  return (
    <section className={shared.section} id='how-it-works' aria-labelledby='loop-title'>
      <div className={shared.sectionHeader}>
        <h2 id='loop-title'>Vòng lặp học tập cộng đồng</h2>
        <p>Kiến thức không dừng ở việc nhận câu trả lời. Nó trở nên hữu ích hơn khi được thực hành, kiểm chứng và trao lại.</p>
      </div>
      <ol className={styles.loopList} aria-label='Vòng lặp học tập cộng đồng'>
        {loopSteps.map((step) => (
          <li className={styles.loopItem} data-tone={step.tone} key={step.title}>
            <span className={styles.loopIcon} aria-hidden='true'><Icon name={step.icon} size={20} /></span>
            <div><h3>{step.title}</h3><p>{step.description}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
