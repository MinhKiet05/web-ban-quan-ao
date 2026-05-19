export const COLOR_HEX_MAP = {
    black: '#111827',
    white: '#f9fafb',
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#facc15',
    pink: '#ec4899',
    purple: '#a855f7',
    orange: '#f97316',
    gray: '#6b7280',
    grey: '#6b7280',
    brown: '#8b5e3c',
    beige: '#d4b996',
    navy: '#1e3a8a',
};

export const SORT_OPTIONS = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price_asc', label: 'Giá tăng dần' },
    { value: 'price_desc', label: 'Giá giảm dần' },
    { value: 'rating', label: 'Đánh giá cao' },
    { value: 'best_selling', label: 'Bán chạy' },
];

export const DEFAULT_COLORS = ['black', 'white', 'blue', 'gray', 'brown', 'beige'];
export const DEFAULT_SIZES = ['s', 'm', 'l', 'xl'];

export const formatPrice = (price) => Number(price || 0).toLocaleString('vi-VN');

export const formatLabel = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
};

export const normalizeText = (value) => String(value || '').trim().toLowerCase();

const COLOR_KEYWORDS = {
    black: ['black', 'đen', 'den'],
    white: ['white', 'trắng', 'trang'],
    blue: ['blue', 'xanh dương', 'xanh duong', 'xanh biển', 'xanh bien', 'xanh navy'],
    green: ['green', 'xanh lá', 'xanh la', 'rêu', 'reu'],
    red: ['red', 'đỏ', 'do'],
    yellow: ['yellow', 'vàng', 'vang'],
    orange: ['orange', 'cam'],
    pink: ['pink', 'hồng', 'hong'],
    purple: ['purple', 'tím', 'tim'],
    gray: ['gray', 'grey', 'xám', 'xam', 'ghi'],
    brown: ['brown', 'nâu', 'nau'],
    beige: ['beige', 'be'],
    navy: ['navy'],
};

export const getColorKeysFromVariantColor = (rawColor) => {
    const text = normalizeText(rawColor);
    if (!text) return [];

    const matched = Object.entries(COLOR_KEYWORDS)
        .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
        .map(([key]) => key);

    if (matched.length > 0) return matched;
    return [text];
};

export const stringToColor = (name) => {
    const key = normalizeText(name);
    if (COLOR_HEX_MAP[key]) return COLOR_HEX_MAP[key];
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = key.charCodeAt(i) + ((hash << 5) - hash);
    return `#${Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6)}`;
};

export const buildQuery = ({
    searchQuery,
    selectedCategories,
    selectedColors,
    selectedShapes,
    minPrice,
    maxPrice,
    minRating,
    isSaleOnly,
    sort,
    limit,
}) => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('sort', sort);

    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategories.length) params.set('category_ids', selectedCategories.join(','));
    if (selectedColors.length) params.set('colors', selectedColors.join(','));
    if (selectedShapes.length) params.set('sizes', selectedShapes.join(','));
    if (minPrice !== '') params.set('min_price', minPrice);
    if (maxPrice !== '') params.set('max_price', maxPrice);
    if (minRating > 0) params.set('rating', String(minRating));
    if (isSaleOnly) params.set('is_sale', 'true');

    return params.toString();
};
