import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearCart } from '../../redux/cart/cartSlice';
import styles from './CheckoutPage.module.css';

const BASE_URL = 'https://web-ban-quan-ao-9s0d.onrender.com/api';

const STEPS = ['INFORMATION', 'SHIPPING', 'PAYMENT'];

const SHIPPING_METHODS = [
    { id: 'standard', label: 'Standard Shipping', desc: '5–7 business days', price: 10000 },
    { id: 'express', label: 'Express Shipping', desc: '2–3 business days', price: 30000 },
    { id: 'overnight', label: 'Overnight Shipping', desc: 'Next business day', price: 60000 },
    { id: 'cod', label: 'Cash on Delivery (COD)', desc: 'Thanh toán khi nhận hàng', price: 15000 },
];

const COUNTRIES = [
    'Vietnam', 'United States', 'United Kingdom', 'France', 'Germany',
    'Japan', 'South Korea', 'Australia', 'Canada', 'Singapore',
];

export default function CheckoutPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { items, totalPrice } = useSelector((state) => state.cart);

    const [step, setStep] = useState(0); // 0: Info, 1: Shipping, 2: Payment

    // Information form
    const [info, setInfo] = useState({
        email: '',
        phone: '',
        firstName: '',
        lastName: '',
        country: '',
        state: '',
        address: '',
        city: '',
        postalCode: '',
    });

    // Shipping
    const [shippingMethod, setShippingMethod] = useState('standard');

    // Payment
    const [payment, setPayment] = useState({
        cardNumber: '',
        cardName: '',
        expiry: '',
        cvv: '',
    });

    const [errors, setErrors] = useState({});
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [apiError, setApiError] = useState('');
    const [placedOrderCode, setPlacedOrderCode] = useState('');

    const selectedShipping = SHIPPING_METHODS.find(m => m.id === shippingMethod);
    const shippingFee = selectedShipping?.price || 10000;
    const subtotal = totalPrice;
    const total = subtotal + shippingFee;

    // --- Validation ---
    const validateInfo = () => {
        const e = {};
        if (!info.email.trim()) e.email = 'Email là bắt buộc';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) e.email = 'Email không hợp lệ';
        if (!info.phone.trim()) e.phone = 'Số điện thoại là bắt buộc';
        else if (!/^\d{10}$/.test(info.phone)) e.phone = 'Số điện thoại phải có 10 chữ số';
        if (!info.firstName.trim()) e.firstName = 'Họ là bắt buộc';
        if (!info.lastName.trim()) e.lastName = 'Tên là bắt buộc';
        if (!info.country) e.country = 'Quốc gia là bắt buộc';
        if (!info.address.trim()) e.address = 'Địa chỉ là bắt buộc';
        if (!info.city.trim()) e.city = 'Thành phố là bắt buộc';
        return e;
    };

    // Detect COD payment method (no card needed)
    const isCOD = shippingMethod === 'cod';

    const validatePayment = () => {
        if (isCOD) return {}; // Không cần validate thẻ với COD
        const e = {};
        if (!payment.cardNumber.trim()) e.cardNumber = 'Số thẻ là bắt buộc';
        else if (!/^\d{16}$/.test(payment.cardNumber.replace(/\s/g, ''))) e.cardNumber = 'Số thẻ phải có 16 chữ số';
        if (!payment.cardName.trim()) e.cardName = 'Tên chủ thẻ là bắt buộc';
        if (!payment.expiry.trim()) e.expiry = 'Ngày hết hạn là bắt buộc';
        else if (!/^\d{2}\/\d{2}$/.test(payment.expiry)) e.expiry = 'Định dạng MM/YY';
        if (!payment.cvv.trim()) e.cvv = 'CVV là bắt buộc';
        else if (!/^\d{3,4}$/.test(payment.cvv)) e.cvv = 'CVV phải có 3–4 chữ số';
        return e;
    };

    // --- Handlers ---
    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setInfo(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handlePaymentChange = (e) => {
        let { name, value } = e.target;
        if (name === 'cardNumber') {
            value = value.replace(/\D/g, '').slice(0, 16)
                .replace(/(.{4})/g, '$1 ').trim();
        }
        if (name === 'expiry') {
            value = value.replace(/\D/g, '').slice(0, 4);
            if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
        }
        if (name === 'cvv') value = value.replace(/\D/g, '').slice(0, 4);
        setPayment(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const goToShipping = () => {
        const e = validateInfo();
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        setErrors({});
        setStep(1);
    };

    const goToPayment = () => {
        setErrors({});
        setStep(2);
    };

    const handlePlaceOrder = async () => {
        const e = validatePayment();
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        setErrors({});
        setApiError('');
        setPlacing(true);

        try {
            const token = localStorage.getItem('accessToken');
            const payload = {
                shipping_name: `${info.firstName} ${info.lastName}`.trim(),
                shipping_phone: info.phone,
                shipping_email: info.email,
                shipping_province: info.state || info.country,
                shipping_district: info.city,
                shipping_ward: info.city,
                shipping_street: info.address,
                shipping_note: null,
                customer_note: null,
                shipping_fee: shippingFee,
                payment_method: isCOD ? 'cod' : 'credit_card',
                items: items.map(item => ({
                    variant_id: item.variantId || item.id,
                    product_name: item.name,
                    product_slug: item.slug || '',
                    sku: item.sku || '',
                    size: item.size || '',
                    color: item.color || '',
                    image_url: item.image || null,
                    unit_price: item.price,
                    quantity: item.quantity,
                })),
            };

            const res = await fetch(`${BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error?.message || data.message || 'Đặt hàng thất bại');
            }

            dispatch(clearCart());
            setPlacedOrderCode(data.data?.order?.order_code || '');
            setOrderPlaced(true);
        } catch (err) {
            setApiError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setPlacing(false);
        }
    };

    const handleBack = () => {
        if (step === 0) navigate(-1);
        else setStep(prev => prev - 1);
    };

    // --- Order placed screen ---
    if (orderPlaced) {
        return (
            <div className={styles.successPage}>
                <div className={styles.successCard}>
                    <div className={styles.successIcon}>✓</div>
                    <h2>Đặt hàng thành công!</h2>
                    {placedOrderCode && (
                        <p className={styles.orderCodeBadge}>Mã đơn hàng: <strong>{placedOrderCode}</strong></p>
                    )}
                    <p>Cảm ơn bạn đã mua hàng. Chúng tôi sẽ gửi email xác nhận đến <strong>{info.email}</strong>.</p>
                    <button className={styles.continueShoppingBtn} onClick={() => navigate('/products')}>
                        Tiếp tục mua sắm
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Left Column */}
                <div className={styles.leftCol}>
                    {/* Back */}
                    <button className={styles.backBtn} onClick={handleBack}>
                        <span className={styles.backArrow}>←</span>
                        <span className={styles.backLine} />
                    </button>

                    {/* Title */}
                    <h1 className={styles.title}>CHECKOUT</h1>

                    {/* Step Tabs */}
                    <div className={styles.stepTabs}>
                        {STEPS.map((s, i) => (
                            <span key={s} className={styles.stepTabGroup}>
                                <button
                                    className={`${styles.stepTab} ${i === step ? styles.stepTabActive : ''} ${i < step ? styles.stepTabDone : ''}`}
                                    onClick={() => i < step && setStep(i)}
                                    disabled={i > step}
                                >
                                    {s}
                                </button>
                                {i < STEPS.length - 1 && <span className={styles.stepSep}>&gt;</span>}
                            </span>
                        ))}
                    </div>

                    {/* ===== STEP 0: INFORMATION ===== */}
                    {step === 0 && (
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>CONTACT INFO</h3>
                            <div className={styles.fieldGroup}>
                                <input
                                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={info.email}
                                    onChange={handleInfoChange}
                                />
                                {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
                            </div>
                            <div className={styles.fieldGroup}>
                                <input
                                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                                    type="tel"
                                    name="phone"
                                    placeholder="Phone"
                                    value={info.phone}
                                    onChange={handleInfoChange}
                                />
                                {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
                            </div>

                            <h3 className={`${styles.sectionTitle} ${styles.sectionTitleSpaced}`}>SHIPPING ADDRESS</h3>
                            <div className={styles.row2}>
                                <div className={styles.fieldGroup}>
                                    <input
                                        className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                                        type="text"
                                        name="firstName"
                                        placeholder="First Name"
                                        value={info.firstName}
                                        onChange={handleInfoChange}
                                    />
                                    {errors.firstName && <span className={styles.errorMsg}>{errors.firstName}</span>}
                                </div>
                                <div className={styles.fieldGroup}>
                                    <input
                                        className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                                        type="text"
                                        name="lastName"
                                        placeholder="Last Name"
                                        value={info.lastName}
                                        onChange={handleInfoChange}
                                    />
                                    {errors.lastName && <span className={styles.errorMsg}>{errors.lastName}</span>}
                                </div>
                            </div>
                            <div className={styles.fieldGroup}>
                                <select
                                    className={`${styles.input} ${styles.select} ${errors.country ? styles.inputError : ''}`}
                                    name="country"
                                    value={info.country}
                                    onChange={handleInfoChange}
                                >
                                    <option value="">Country</option>
                                    {COUNTRIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                {errors.country && <span className={styles.errorMsg}>{errors.country}</span>}
                            </div>
                            <div className={styles.fieldGroup}>
                                <input
                                    className={styles.input}
                                    type="text"
                                    name="state"
                                    placeholder="State / Region"
                                    value={info.state}
                                    onChange={handleInfoChange}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <input
                                    className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                                    type="text"
                                    name="address"
                                    placeholder="Address"
                                    value={info.address}
                                    onChange={handleInfoChange}
                                />
                                {errors.address && <span className={styles.errorMsg}>{errors.address}</span>}
                            </div>
                            <div className={styles.row2}>
                                <div className={styles.fieldGroup}>
                                    <input
                                        className={`${styles.input} ${errors.city ? styles.inputError : ''}`}
                                        type="text"
                                        name="city"
                                        placeholder="City"
                                        value={info.city}
                                        onChange={handleInfoChange}
                                    />
                                    {errors.city && <span className={styles.errorMsg}>{errors.city}</span>}
                                </div>
                                <div className={styles.fieldGroup}>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        name="postalCode"
                                        placeholder="Postal Code"
                                        value={info.postalCode}
                                        onChange={handleInfoChange}
                                    />
                                </div>
                            </div>

                            <button className={styles.actionBtn} onClick={goToShipping}>
                                Shipping <span className={styles.btnArrow}>→</span>
                            </button>
                        </div>
                    )}

                    {/* ===== STEP 1: SHIPPING ===== */}
                    {step === 1 && (
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>SHIPPING METHOD</h3>

                            {/* Contact & address summary */}
                            <div className={styles.summaryBox}>
                                <div className={styles.summaryBoxRow}>
                                    <span className={styles.summaryBoxLabel}>Contact</span>
                                    <span>{info.email}</span>
                                    <button className={styles.changeLink} onClick={() => setStep(0)}>Change</button>
                                </div>
                                <div className={styles.summaryBoxDivider} />
                                <div className={styles.summaryBoxRow}>
                                    <span className={styles.summaryBoxLabel}>Ship to</span>
                                    <span>{info.address}, {info.city}{info.state ? ', ' + info.state : ''}, {info.country}</span>
                                    <button className={styles.changeLink} onClick={() => setStep(0)}>Change</button>
                                </div>
                            </div>

                            <div className={styles.shippingOptions}>
                                {SHIPPING_METHODS.map(method => (
                                    <label
                                        key={method.id}
                                        className={`${styles.shippingOption} ${shippingMethod === method.id ? styles.shippingOptionActive : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="shippingMethod"
                                            value={method.id}
                                            checked={shippingMethod === method.id}
                                            onChange={() => setShippingMethod(method.id)}
                                            className={styles.radioInput}
                                        />
                                        <span className={styles.radioCustom} />
                                        <span className={styles.shippingInfo}>
                                            <span className={styles.shippingLabel}>{method.label}</span>
                                            <span className={styles.shippingDesc}>{method.desc}</span>
                                        </span>
                                        <span className={styles.shippingPrice}>
                                            {method.price.toLocaleString('vi-VN')}đ
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <button className={styles.actionBtn} onClick={goToPayment}>
                                Payment <span className={styles.btnArrow}>→</span>
                            </button>
                        </div>
                    )}

                    {/* ===== STEP 2: PAYMENT ===== */}
                    {step === 2 && (
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>PAYMENT</h3>

                            {/* Contact & address summary */}
                            <div className={styles.summaryBox}>
                                <div className={styles.summaryBoxRow}>
                                    <span className={styles.summaryBoxLabel}>Contact</span>
                                    <span>{info.email}</span>
                                    <button className={styles.changeLink} onClick={() => setStep(0)}>Change</button>
                                </div>
                                <div className={styles.summaryBoxDivider} />
                                <div className={styles.summaryBoxRow}>
                                    <span className={styles.summaryBoxLabel}>Ship to</span>
                                    <span>{info.address}, {info.city}, {info.country}</span>
                                    <button className={styles.changeLink} onClick={() => setStep(0)}>Change</button>
                                </div>
                                <div className={styles.summaryBoxDivider} />
                                <div className={styles.summaryBoxRow}>
                                    <span className={styles.summaryBoxLabel}>Method</span>
                                    <span>{selectedShipping?.label} · {selectedShipping?.price.toLocaleString('vi-VN')}đ</span>
                                    <button className={styles.changeLink} onClick={() => setStep(1)}>Change</button>
                                </div>
                            </div>

                            {isCOD ? (
                                <div className={styles.codNotice}>
                                
                                    <span>Bạn sẽ thanh toán tiền mặt khi nhận hàng. Không cần nhập thông tin thẻ.</span>
                                </div>
                            ) : (
                                <>
                                    <h3 className={`${styles.sectionTitle} ${styles.sectionTitleSpaced}`}>CARD DETAILS</h3>
                                    <div className={styles.fieldGroup}>
                                        <input
                                            className={`${styles.input} ${errors.cardNumber ? styles.inputError : ''}`}
                                            type="text"
                                            name="cardNumber"
                                            placeholder="Card Number"
                                            value={payment.cardNumber}
                                            onChange={handlePaymentChange}
                                            maxLength={19}
                                        />
                                        {errors.cardNumber && <span className={styles.errorMsg}>{errors.cardNumber}</span>}
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <input
                                            className={`${styles.input} ${errors.cardName ? styles.inputError : ''}`}
                                            type="text"
                                            name="cardName"
                                            placeholder="Name on Card"
                                            value={payment.cardName}
                                            onChange={handlePaymentChange}
                                        />
                                        {errors.cardName && <span className={styles.errorMsg}>{errors.cardName}</span>}
                                    </div>
                                    <div className={styles.row2}>
                                        <div className={styles.fieldGroup}>
                                            <input
                                                className={`${styles.input} ${errors.expiry ? styles.inputError : ''}`}
                                                type="text"
                                                name="expiry"
                                                placeholder="MM/YY"
                                                value={payment.expiry}
                                                onChange={handlePaymentChange}
                                                maxLength={5}
                                            />
                                            {errors.expiry && <span className={styles.errorMsg}>{errors.expiry}</span>}
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <input
                                                className={`${styles.input} ${errors.cvv ? styles.inputError : ''}`}
                                                type="text"
                                                name="cvv"
                                                placeholder="CVV"
                                                value={payment.cvv}
                                                onChange={handlePaymentChange}
                                                maxLength={4}
                                            />
                                            {errors.cvv && <span className={styles.errorMsg}>{errors.cvv}</span>}
                                        </div>
                                    </div>
                                </>
                            )}

                            {apiError && <p className={styles.apiError}>{apiError}</p>}

                            <button
                                className={styles.actionBtn}
                                onClick={handlePlaceOrder}
                                disabled={placing}
                            >
                                {placing ? 'Đang xử lý...' : 'Place Order'}
                                {!placing && <span className={styles.btnArrow}>→</span>}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column — Order Summary */}
                <div className={styles.rightCol}>
                    <div className={styles.orderPanel}>
                        <div className={styles.orderHeader}>
                            <span className={styles.orderTitle}>YOUR ORDER</span>
                            <span className={styles.orderBadge}>{items.length}</span>
                        </div>

                        <div className={styles.orderItems}>
                            {items.length === 0 ? (
                                <p className={styles.emptyOrder}>Giỏ hàng trống</p>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className={styles.orderItem}>
                                        <div className={styles.orderItemImage}>
                                            {item.image
                                                ? <img src={item.image} alt={item.name} />
                                                : <div className={styles.orderItemImagePlaceholder} />
                                            }
                                            <span className={styles.orderItemQtyBadge}>{item.quantity}</span>
                                        </div>
                                        <div className={styles.orderItemInfo}>
                                            <div className={styles.orderItemNameRow}>
                                                <span className={styles.orderItemName}>{item.name}</span>
                                                <button
                                                    className={styles.changeLink}
                                                    onClick={() => navigate('/cart')}
                                                >
                                                    Change
                                                </button>
                                            </div>
                                            <span className={styles.orderItemVariant}>
                                                {[item.color, item.size].filter(Boolean).join('/')}
                                            </span>
                                            <div className={styles.orderItemPriceRow}>
                                                <span className={styles.orderItemQty}>({item.quantity})</span>
                                                <span className={styles.orderItemPrice}>
                                                    $ {parseFloat(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className={styles.orderDivider} />

                        <div className={styles.orderSummaryRow}>
                            <span>Subtotal</span>
                            <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className={styles.orderSummaryRow}>
                            <span>Shipping</span>
                            <span className={styles.shippingNote}>
                                {step === 0 ? 'Calculated at next step' : `$${shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                            </span>
                        </div>

                        <div className={styles.orderDivider} />

                        <div className={`${styles.orderSummaryRow} ${styles.totalRow}`}>
                            <span>Total</span>
                            <span>${(step === 0 ? subtotal : total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
