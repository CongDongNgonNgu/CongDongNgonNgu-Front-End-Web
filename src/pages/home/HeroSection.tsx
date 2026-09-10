import { Icon } from '../../components/ui/Icon/Icon';
import heroImage from '../../assets/language-community-hero-v2.jpg';
import { heroImageAlt } from './home.constants';
import shared from './HomeShared.module.css';
import styles from './HeroSection.module.css';

export function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby='page-title'>
      <div className={styles.heroCopy}>
        <p className={shared.kicker}>Cộng đồng ngôn ngữ</p>
        <h1 id='page-title'>Học ngôn ngữ cùng nhau.</h1>
        <p className={styles.lede}>
          Một cộng đồng mở để học cùng con người, thực hành với AI và xây dựng tri thức ngôn ngữ.
        </p>
        <div className={styles.heroActions}>
          <a className={`${shared.buttonLink} ${shared.buttonPrimary}`} href='#how-it-works'>Xem cách bắt đầu</a>
          <a className={`${shared.buttonLink} ${shared.buttonSecondary}`} href='#community'>Khám phá cộng đồng</a>
        </div>
        <p className={styles.heroNote}>
          <Icon name='users' size={18} />
          Từ người mới bắt đầu đến người muốn chia sẻ điều mình biết.
        </p>
      </div>
      <figure className={styles.heroMedia}>
        <img src={heroImage} alt={heroImageAlt} width='1200' height='800' loading='eager' decoding='async' />
        <figcaption>
          <span>Cộng đồng học tập thực tế từ những con người thực tế.</span>
          <Icon name='globe' size={18} />
        </figcaption>
      </figure>
    </section>
  );
}
