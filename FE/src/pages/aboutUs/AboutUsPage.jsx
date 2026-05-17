import { Link } from 'react-router-dom';
import styles from './AboutUsPage.module.css';
import sampleImage3 from '../../assets/images/sample3.webp';
import sampleImage4 from '../../assets/images/sample4.webp';
import TextType from '../../components/TextType/TextType';

const storySections = [
    {
        eyebrow: 'Since 2014',
        title: 'What We Do',
        description:
            'KHK Fashion mang đến các bộ sưu tập thời trang chất lượng cao, kết hợp giữa xu hướng hiện đại và tính ứng dụng hằng ngày. Chúng tôi tập trung vào chất liệu bền đẹp, phom dáng vừa vặn và trải nghiệm mua sắm dễ dàng. Với sự đa dạng về sản phẩm, từ áo thun, quần jeans đến áo khoác và phụ kiện, KHK Fashion đáp ứng nhu cầu của những người trẻ năng động và yêu thời trang. Chúng tôi không chỉ bán quần áo mà còn tạo ra một cộng đồng thời trang nơi khách hàng có thể tìm thấy cảm hứng và thể hiện phong cách riêng của mình.',
        
        image: sampleImage4,
        reverse: false,
    },
    {
        eyebrow: '',
        title: 'When We Started',
        description:'Từ một nhóm nhỏ đam mê thời trang, KHK Fashion đã phát triển thành thương hiệu được khách hàng trẻ tin tưởng. Từng sản phẩm được chọn lọc kỹ lưỡng để giữ vững tiêu chí đẹp, thoải mái và bền vững theo thời gian. Chúng tôi luôn lắng nghe phản hồi của khách hàng để cải thiện và mang đến những trải nghiệm mua sắm tốt nhất. KHK Fashion không ngừng đổi mới và phát triển, hướng tới mục tiêu trở thành thương hiệu thời trang hàng đầu tại Việt Nam, nơi mọi người có thể tìm thấy phong cách riêng của mình một cách dễ dàng và tự tin.',
        image: sampleImage3,
        reverse: true,
    },
];

const teamMembers = [
    {
        name: 'Trần Huỳnh Minh Kiệt',
        role: 'Co Founder',
        image: './MK.png',
    },
    {
        name: 'Đinh Tấn Khiêm',
        role: 'CTO',
        image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80&auto=format&fit=crop',
    },
    {
        name: 'Nguyễn Huy Hoàng',
        role: 'CEO',
        image: './HH.png',
    },
];

export default function AboutUsPage() {
    return (
        <div className={styles.aboutPage}>
            <section className={styles.heroSection} data-aos="fade-up">
                <h1 className={styles.heroTitle}>Who we are?</h1>
                <p className={styles.heroDescription}>
                    <TextType
                        texts={[
                            'KHK Fashion là đội ngũ yêu thời trang và tin rằng mỗi người đều xứng đáng mặc đẹp theo cách riêng. Chúng tôi xây dựng một không gian mua sắm hiện đại, thân thiện và luôn cập nhật xu hướng mới nhất. Với sự đa dạng về sản phẩm và cam kết về chất lượng, KHK Fashion mong muốn trở thành điểm đến yêu thích của những người trẻ yêu thời trang tại Việt Nam.'
                        ]}
                        typingSpeed={20}
                        pauseDuration={2000}
                        showCursor={false}
                    />
                </p>
            </section>

            <section className={styles.storySection} >
                {storySections.map((item) => (
                    <article
                        key={item.title}
                        className={`${styles.storyRow} ${item.reverse ? styles.reverse : ''}`}
                        data-aos="fade-up"
                    >
                        <div className={styles.storyContent}>
                            {item.eyebrow ? <p className={styles.eyebrow}>{item.eyebrow}</p> : null}
                            <h2>{item.title}</h2>
                            <p>
                                <TextType
                                    texts={[item.description]}
                                    typingSpeed={30}
                                    pauseDuration={2000}
                                    showCursor={false}
                                />
                            </p>
                        </div>
                        <div className={styles.imageStack}>
                            <img src={item.image} alt={item.title} className={styles.imageBack} />
                            <img src={item.image} alt={item.title} className={styles.imageMiddle} />
                            <img src={item.image} alt={item.title} className={styles.imageFront} />
                        </div>
                    </article>
                ))}
            </section>

            <section className={styles.teamSection} data-aos="fade-up">
                <h2>Đội ngũ của chúng tôi</h2>
                <p>
                    <TextType
                        texts={[
                            "Đội ngũ KHK quy tụ những thành viên có kinh nghiệm trong thiết kế, vận hành và phát triển thương hiệu. Chúng tôi cùng nhau tạo nên những bộ sưu tập phù hợp với nhiều phong cách sống."
                        ]}
                        typingSpeed={30}
                        pauseDuration={2000}
                        showCursor={false}
                    />
                </p>

                <div className={styles.teamGrid}>
                    {teamMembers.map((member) => (
                        <article key={member.name} className={styles.memberCard}>
                            <img src={member.image} alt={member.name} loading="lazy" />
                            <h3>{member.name}</h3>
                            <span>{member.role}</span>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}