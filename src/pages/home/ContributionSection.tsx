import { Icon } from '../../components/ui/Icon/Icon';
import { contributionItems } from './home.constants';
import shared from './HomeShared.module.css';
import styles from './ContributionSection.module.css';

export function ContributionSection() {
  return (
    <section className={shared.section} id='community' aria-labelledby='contribution-title'>
      <div className={shared.sectionHeader}>
        <h2 id='contribution-title'>Mỗi đóng góp làm tri thức chung tốt hơn.</h2>
        <p>Một câu trả lời, một ví dụ hay một ghi chú phát âm đều có thể giúp người học tiếp theo bắt đầu dễ hơn.</p>
      </div>
      <ul className={styles.contributionList}>
        {contributionItems.map((item) => (
          <li key={item.title}><Icon name={item.icon} size={20} /><h3>{item.title}</h3><p>{item.description}</p></li>
        ))}
      </ul>
    </section>
  );
}
