import styles from './ProductPage.module.css';
import ProductCard from '../../components/productCard/ProductCard';
import { useProducts } from '../../context/ProductContext';

export default function ProductPage() {
    // Lấy dữ liệu products từ Context
    const { products, loading, error } = useProducts();

    // Hiển thị loading state
    if (loading) {
        return (
            <div className={styles.productPage}>
                <div className={styles.wrapper}>
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Đang tải sản phẩm...</p>
                </div>
            </div>
        );
    }

    // Hiển thị error state
    if (error) {
        return (
            <div className={styles.productPage}>
                <div className={styles.wrapper}>
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Lỗi: {error}</p>
                </div>
            </div>
        );
    }

    // Hiển thị danh sách sản phẩm
    return (
        <div className={styles.productPage}>
            <div className={styles.wrapper}>
                {products && products.length > 0 ? (
                    products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Không có sản phẩm nào</p>
                )}
            </div>
        </div>
    );
}