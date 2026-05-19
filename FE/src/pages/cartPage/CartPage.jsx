import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { remoteFromCart, clearCart, updateQuantity, fetchCartFromAPI, updateCartItemAPI } from '../../redux/cart/cartSlice';
import styles from "./CartPage.module.css";

const SHIPPING_FEE = 10000;

export default function CartPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items, totalPrice, loading } = useSelector((state) => state.cart);
    const [agreed, setAgreed] = useState(false);
    const [activeTab, setActiveTab] = useState('bag');

    // Fetch cart từ server khi user đã đăng nhập
    useEffect(() => {
        if (localStorage.getItem('accessToken')) {
            dispatch(fetchCartFromAPI());
        }
    }, [dispatch]);

    const isLoggedIn = !!localStorage.getItem('accessToken');

    const handleUpdateQty = (item, newQty) => {
        if (isLoggedIn && item.id && !item.id.startsWith('temp_')) {
            dispatch(updateCartItemAPI({ cart_item_id: item.id, quantity: newQty, added_price: item.price }));
        } else {
            dispatch(updateQuantity({ id: item.id, quantity: newQty }));
        }
    };

    const subtotal = totalPrice;
    const total = subtotal + SHIPPING_FEE;

    return (
        <div className={styles.cartPage}>
            <div className={styles.wrapper}>
                {/* Left column */}
                <div className={styles.leftCol}>
                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'bag' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('bag')}
                        >
                            SHOPPING BAG
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'fav' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('fav')}
                        >
                            ♡ FAVOURITES
                        </button>
                    </div>
                    <div className={styles.divider} />

                    {/* Items */}
                        {loading ? (
                        <p className={styles.empty}>Đang tải giỏ hàng...</p>
                    ) : items.length === 0 ? (
                        <p className={styles.empty}>Giỏ hàng của bạn đang trống.</p>
                    ) : (
                        <div className={styles.itemList}>
                            {items.map(item => (
                                <div key={item.id} className={styles.cartItem}>
                                    {/* Image */}
                                    <div className={styles.imageWrap}>
                                        {item.image ? <img src={item.image} alt={item.name} className={styles.itemImage} /> : <div className={styles.itemImage} />}
                                        <button
                                            className={styles.wishBtn}
                                            title="Yêu thích"
                                        >♡</button>
                                    </div>

                                    {/* Info */}
                                    <div className={styles.itemInfo}>
                                        {/* Remove */}
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => dispatch(remoteFromCart(item.id))}
                                            title="Xóa"
                                        >✕</button>

                                        {/* Size & Color */}
                                        <div className={styles.variantRow}>
                                            <span className={styles.sizeTag}>{item.size || 'M'}</span>
                                            <span className={styles.colorSwatch} style={{ background: item.color || '#111' }} />
                                        </div>

                                        {/* Quantity */}
                                        <div className={styles.qtyControl}>
                                            <button onClick={() => handleUpdateQty(item, item.quantity + 1)}>+</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => handleUpdateQty(item, Math.max(1, item.quantity - 1))}>−</button>
                                        </div>

                                        {/* Name & Price */}
                                        <div className={styles.itemMeta}>
                                            <p className={styles.itemCategory}>Quần áo</p>
                                            <p className={styles.itemName}>{item.name}</p>
                                            <p className={styles.itemPrice}>{parseFloat(item.price).toLocaleString('vi-VN')}đ</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={styles.divider} />
                </div>

                {/* Right column — Order Summary */}
                <div className={styles.rightCol}>
                    <div className={styles.summary}>
                        <h3 className={styles.summaryTitle}>ORDER SUMMARY</h3>
                        <div className={styles.summaryRow}>
                            <span>Subtotal</span>
                            <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Shipping</span>
                            <span>{SHIPPING_FEE.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className={styles.divider} />
                        <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                            <span>TOTAL <small>(TAX INCL.)</small></span>
                            <span>{total.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <label className={styles.agreeLabel}>
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                            />
                            I agree to the Terms and Conditions
                        </label>
                        <button
                            className={styles.continueBtn}
                            disabled={!agreed || items.length === 0}
                            onClick={() => navigate('/checkout')}
                        >
                            CONTINUE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}