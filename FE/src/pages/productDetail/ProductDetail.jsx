import styles from './ProductDetail.module.css';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addToCart, addToCartAPI } from '../../redux/cart/cartSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShoppingCart,
    faBurst,
    faStar,
    faCrown,
    faSpinner,
    faCircleExclamation,
    faCheck,
    faXmark,
    faBox,
    faStore
} from '@fortawesome/free-solid-svg-icons';
import ProductCard from '../../components/productCard/ProductCard';
import { useProducts } from '../../context/ProductContext';

const API_BASE_URL = 'https://web-ban-quan-ao-9s0d.onrender.com/api/products';

export default function ProductDetail() {
    const { slug } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    
    // Get all products from context for related products section
    const { products: allProducts } = useProducts();

    // Fetch product detail từ API dựa trên slug
    useEffect(() => {
        const fetchProductDetail = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(`${API_BASE_URL}/${slug}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                if (!res.ok) {
                    throw new Error(`Không tìm thấy sản phẩm (${res.status})`);
                }

                const data_res = await res.json();

                if (data_res.success && data_res.data && data_res.data.product) {
                    const productData = data_res.data.product;
                    setProduct(productData);

                    // Set default variant (default variant hoặc variant đầu tiên)
                    if (productData.variants && productData.variants.length > 0) {
                        const defaultVar = productData.variants.find(v => v.is_default) || productData.variants[0];
                        setSelectedVariant(defaultVar);
                    }
                    setSelectedImageIndex(0);
                } else {
                    throw new Error('Cấu trúc dữ liệu không hợp lệ');
                }

            } catch (err) {
                console.error('Error fetching product:', err);
                setError(err.message);
                setProduct(null);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchProductDetail();
        }
    }, [slug]);

    // Loading state
    if (loading) {
        return (
            <div className={styles.detailPage}>
                <div className={styles.wrapper}>
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ fontSize: '1.2rem' }}>
                            <FontAwesomeIcon icon={faSpinner} spin /> Đang tải thông tin sản phẩm...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !product) {
        return (
            <div className={styles.detailPage}>
                <div className={styles.wrapper}>
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ fontSize: '1.2rem', color: '#d32f2f' }}>
                            <FontAwesomeIcon icon={faCircleExclamation} /> {error || 'Sản phẩm không tồn tại'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Tính tổng stock từ các variants
    const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock_qty || 0), 0) || product.total_stock || 0;

    // Format giá
    const formatPrice = (price) => {
        return parseFloat(price).toLocaleString('vi-VN');
    };

    const formatDescription = (text) => {
    if (!text) return '';

    // 1. Dịch ngược các HTML entities (ví dụ: &amp; -> &)
    let formattedText = text.replace(/&amp;/g, '&');

    // 2. Tự động thêm 2 dấu xuống dòng (\n\n) trước các số thứ tự (1. 2. 3.) và các Tiêu đề lớn
    formattedText = formattedText.replace(/(?=\b\d+\.\s)|(?=TỔNG KẾT)|(?=THÔNG TIN NHANH)|(?=Mô Tả Ngắn)/g, '\n\n');

    // 3. Thêm 1 dấu xuống dòng (\n) trước các mục con để dễ đọc hơn
    formattedText = formattedText.replace(/(?=Chất liệu:)|(?=Chi tiết sản phẩm:)|(?=Lưu ý giặt \/ ủi:)|(?=Giặt:)|(?=Ủi:)/g, '\n');

    return formattedText.trim();
};
    
    return (
        <div className={styles.detailPage}>
            <div className={styles.wrapper}>
                <div className={styles.detailContainer}>
                    {/* Product Images Section */}
                    <div className={styles.imageSection}>
                        <div className={styles.mainImage}>
                            <img
                                src={product.product_images?.[selectedImageIndex]?.url || product.product_images?.[0]?.url || product.primary_image?.url}
                                alt={product.name}
                                className={styles.productImage}
                            />

                            {/* Discount Badge */}
                            {product.is_sale && product.discount_percent > 0 && (
                                <div className={styles.discountBadge}>
                                    -{product.discount_percent}%
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Images */}
                        {product.product_images && product.product_images.length > 1 && (
                            <div className={styles.thumbnails}>
                                {product.product_images.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img.thumbnail_url || img.url}
                                        alt={`Product ${idx + 1}`}
                                        className={`${styles.thumbnail} ${selectedImageIndex === idx ? styles.selected : ''}`}
                                        onClick={() => setSelectedImageIndex(idx)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info Section */}
                    <div className={styles.infoSection}>
                        {/* Category & Brand */}
                        <div className={styles.breadcrumb}>
                            <span className={styles.category}>{product.category_name}</span>
                            <span className={styles.brand}>| {product.brand}</span>
                        </div>

                        {/* Product Name */}
                        <h1 className={styles.title}>{product.name}</h1>

                        {/* Rating */}
                        {product.avg_rating > 0 && (
                            <div className={styles.rating}>
                                <div className={styles.stars}>
                                    {'★'.repeat(Math.round(product.avg_rating))}
                                    {'☆'.repeat(5 - Math.round(product.avg_rating))}
                                </div>
                                <span className={styles.ratingScore}>{parseFloat(product.avg_rating).toFixed(1)}</span>
                                <span className={styles.reviewCount}>({product.review_count} reviews)</span>
                            </div>
                        )}

                        {/* Price Section */}
                        <div className={styles.priceSection}>
                            <span className={styles.price}>{formatPrice(product.display_price || product.base_price)}đ</span>
                            {product.is_sale && product.original_price && (
                                <span className={styles.originalPrice}>{formatPrice(product.original_price)}đ</span>
                            )}
                        </div>



                        {/* Variants Section - Size Selection */}
                        {product.variants && product.variants.length > 0 && (
                            <div className={styles.variantsSection}>
                                <label className={styles.variantLabel}>Chọn size:</label>
                                <div className={styles.variantGrid}>
                                    {product.variants.map((variant) => (
                                        <button
                                            key={variant.id}
                                            className={`${styles.variantOption} ${selectedVariant?.id === variant.id ? styles.selected : ''}`}
                                            onClick={() => setSelectedVariant(variant)}
                                            disabled={!variant.is_active || variant.stock_qty === 0}
                                            title={variant.stock_qty === 0 ? 'Hết hàng' : ''}
                                        >
                                            <span className={styles.sizeText}>{variant.size}</span>
                                            {variant.stock_qty === 0 && (
                                                <span className={styles.outOfStock}>Hết hàng</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {selectedVariant && (
                                    <p className={styles.variantStock}>
                                        <FontAwesomeIcon icon={faCheck} /> Còn: {selectedVariant.stock_qty} sản phẩm
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Quantity Section */}
                        <div className={styles.quantitySection}>
                            <label className={styles.quantityLabel}>Số lượng:</label>
                            <div className={styles.quantityControl}>
                                <button
                                    className={styles.quantityBtn}
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className={styles.quantityInput}
                                    min="1"
                                    max={selectedVariant?.stock_qty || totalStock}
                                />
                                <button
                                    className={styles.quantityBtn}
                                    onClick={() => setQuantity(quantity + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>


                        {/* Add to Cart Button */}
                        <button
                            className={styles.addToCartBtn}
                            disabled={totalStock === 0}
                            onClick={() => {
                                const price = parseFloat(product.display_price || product.base_price);
                                const image = product.product_images?.[0]?.url || product.primary_image?.url || '';
                                if (localStorage.getItem('accessToken') && selectedVariant?.id) {
                                    dispatch(addToCartAPI({
                                        variant_id: String(selectedVariant.id),
                                        quantity: quantity,
                                        added_price: price,
                                        localItem: {
                                            id: String(selectedVariant.id),
                                            variantId: String(selectedVariant.id),
                                            name: product.name,
                                            price,
                                            quantity,
                                            image,
                                            size: selectedVariant.size,
                                            color: selectedVariant.color,
                                        },
                                    }));
                                } else {
                                    dispatch(addToCart({
                                        id: String(selectedVariant?.id || product.id),
                                        variantId: String(selectedVariant?.id || product.id),
                                        name: product.name,
                                        price,
                                        quantity,
                                        image,
                                    }));
                                }
                            }}
                        >
                            <FontAwesomeIcon icon={faShoppingCart} /> Thêm vào giỏ hàng
                        </button>
                        <button
                            className={styles.buyNow}
                            disabled={totalStock === 0}
                            onClick={() => {
                                const price = parseFloat(product.display_price || product.base_price);
                                const image = product.product_images?.[0]?.url || product.primary_image?.url || '';
                                if (localStorage.getItem('accessToken') && selectedVariant?.id) {
                                    dispatch(addToCartAPI({
                                        variant_id: String(selectedVariant.id),
                                        quantity: quantity,
                                        added_price: price,
                                        localItem: {
                                            id: String(selectedVariant.id),
                                            variantId: String(selectedVariant.id),
                                            name: product.name,
                                            price,
                                            quantity,
                                            image,
                                            size: selectedVariant.size,
                                            color: selectedVariant.color,
                                        },
                                    }));
                                } else {
                                    dispatch(addToCart({
                                        id: String(selectedVariant?.id || product.id),
                                        variantId: String(selectedVariant?.id || product.id),
                                        name: product.name,
                                        price,
                                        quantity,
                                        image,
                                    }));
                                }
                                navigate('/checkout');
                            }}
                        >
                            Mua ngay
                        </button>

                    </div>
                </div>

                {/* Product Description Section */}
                {product.description && (
                    <div className={styles.descriptionSection}>
                        <div className={styles.titleInfo}>
                            Thông tin sản phẩm
                        </div>
                        <div className={styles.descriptionContent}>
                            {formatDescription(product.description)}
                        </div>

                        <div className={styles.infoCard}>
                            <h3><FontAwesomeIcon icon={faBox} /> Thông tin vận chuyển</h3>
                            <p>{product.requires_shipping ? 'Vận chuyển miễn phí toàn quốc' : 'Không có dịch vụ vận chuyển'}</p>
                            {product.weight_grams && <p>Trọng lượng: {product.weight_grams}g</p>}
                        </div>

                        <div className={styles.infoCard}>
                            <h3><FontAwesomeIcon icon={faStore} /> Trạng thái sản phẩm</h3>
                            <p>Được tạo: {new Date(product.created_at).toLocaleDateString('vi-VN')}</p>
                            {product.updated_at && <p>Được cập nhật: {new Date(product.updated_at).toLocaleDateString('vi-VN')}</p>}
                        </div>
                    </div>
                )}

                {/* Additional Info */}
                
            </div>

            {/* Related Products Section */}
            <div className={styles.relatedProductsSection}>
                <div className={styles.relatedProductsWrapper}>
                    <h2 className={styles.relatedProductsTitle}>Sản phẩm liên quan</h2>
                    
                    <div className={styles.relatedProductsGrid}>
                        {!product ? (
                            <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Không có sản phẩm liên quan</p>
                        ) : (
                            <>
                                {/* Get 4 products excluding current product */}
                                {allProducts.filter(p => p.id !== product.id).slice(0, 4).length > 0 ? (
                                    allProducts.filter(p => p.id !== product.id).slice(0, 4).map((relatedProduct) => (
                                        <ProductCard key={relatedProduct.id} product={relatedProduct} />
                                    ))
                                ) : (
                                    <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Không có sản phẩm liên quan</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
