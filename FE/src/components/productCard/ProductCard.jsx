import styles from './ProductCard.module.css';
import { useNavigate } from 'react-router-dom';

export default function ProductCard({ product }) {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/products/${product.slug}`, { state: { product } });
    };

    const getBadges = () => {
        const badges = [];
        
        if (product.is_sale && product.discount_percent > 0) {
            badges.push({ type: 'discount', text: `-${product.discount_percent}%` });
        } else if (product.is_new) {
            badges.push({ type: 'new', text: 'New' });
        } else if (product.is_bestseller) {
            badges.push({ type: 'bestseller', text: 'Bestseller' });
        } else if (product.is_featured) {
            badges.push({ type: 'featured', text: 'Featured' });
        }
        
        return badges;
    };

    const formatPrice = (price) => {
        return parseFloat(price).toLocaleString('vi-VN');
    };

    const getPrimaryBadge = () => {
        const badges = getBadges();
        return badges.length > 0 ? badges[0] : null;
    };

    const primaryBadge = getPrimaryBadge();

    return (
        <article className={`${styles.card} ${product.is_sale ? styles.onSale : ''}`} onClick={handleCardClick}>
            <div className={styles.imageWrap}>
                <img 
                    src={product.primary_image?.url} 
                    alt={product.name} 
                    className={styles.image} 
                />
                {primaryBadge && (
                    <div className={`${styles.badgeContainer} ${styles[`badge-${primaryBadge.type}`]}`}>
                        {primaryBadge.text}
                    </div>
                )}
            </div>

            <div className={styles.content}>
                

                <h3 className={styles.title}>{product.name}</h3>
                
                {product.avg_rating > 0 && (
                    <div className={styles.rating}>
                        <span className={styles.stars}>★ {parseFloat(product.avg_rating).toFixed(1)}</span>
                        <span className={styles.reviewCount}>({product.review_count})</span>
                    </div>
                )}

                <div className={styles.priceSection}>
                    <span className={styles.price}>{formatPrice(product.display_price)}₫</span>
                    {product.is_sale && product.original_price && parseFloat(product.original_price) > parseFloat(product.display_price) && (
                        <span className={styles.originalPrice}>₫{formatPrice(product.original_price)}</span>
                    )}
                </div>

                <div className={styles.bottomRow}>
                    {product.sold_count > 0 && (
                        <span className={styles.soldCount}>Đã bán: {product.sold_count}</span>
                    )}
                </div>
            </div>
        </article>
    );
}
