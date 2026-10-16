import { Link } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon/Icon';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import styles from './CommunityLanguageDiscoveryCard.module.css';
export function CommunityLanguageDiscoveryCard() {
 const {t}=useUiLocale();
 return <section className={styles.card} aria-labelledby='community-language-discovery'>
   <span className={styles.icon} aria-hidden='true'><Icon name='languages' size={24}/></span>
   <h2 id='community-language-discovery'>{t('community.discovery.title')}</h2>
   <p>{t('community.discovery.description')}</p>
   <Link to='/languages'>{t('community.posts.explore.languages')}<Icon name='compass' size={18}/></Link>
 </section>;
}
