import { useState } from 'react';
import { formatLabel, formatPrice, stringToColor } from '../../utils/searchFilters.utils';
import styles from './SearchFiltersPanel.module.css';
export default function SearchFiltersPanel({
    isMobile = false,
    filtersMeta,
    selectedShapes,
    selectedCategories,
    selectedColors,
    priceRange,
    isSaleOnly,
    minRating,
    clearAll,
    setSelectedShapes,
    setSelectedCategories,
    setSelectedColors,
    setPriceRange,
    setIsSaleOnly,
    setMinRating,
}) {
    const [openSections, setOpenSections] = useState({
        size: false,
        category: true,
        color: false,
        price: false,
        sale: false,
        rating: false,
    });

    const toggleArrayValue = (setter, value) => {
        setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    };

    const toggleSection = (key) => {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const activeCount = {
        size: selectedShapes.length,
        category: selectedCategories.length,
        color: selectedColors.length,
        price: priceRange.min || priceRange.max ? 1 : 0,
        sale: isSaleOnly ? 1 : 0,
        rating: minRating > 0 ? 1 : 0,
    };

    const SectionHeader = ({ sectionKey, title }) => (
        <button
            type="button"
            onClick={() => toggleSection(sectionKey)}
            className="w-full flex items-center justify-between py-1 text-left"
        >
            <span className="font-semibold text-gray-900 text-sm">{title}</span>
            <div className="flex items-center gap-2">
                {activeCount[sectionKey] > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-gray-900 text-white text-[11px] flex items-center justify-center">
                        {activeCount[sectionKey]}
                    </span>
                )}
                <span className="text-gray-500 text-xs">{openSections[sectionKey] ? '▲' : '▼'}</span>
            </div>
        </button>
    );

    return (
        <aside className={`${styles.noScrollbar} w-full flex flex-col gap-4 bg-white p-4 border border-gray-100 shadow-sm ${isMobile ? '' : 'sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto'} scrollbar-thin`}>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Bộ lọc sản phẩm</p>
                <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors"
                >
                    Đặt lại
                </button>
            </div>

            <div className="border-b pb-3">
                <SectionHeader sectionKey="size" title="Shape / Fit (Size)" />
                {openSections.size && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {filtersMeta.sizes.map((size) => (
                            <button
                                key={size}
                                type="button"
                                className={`px-3 py-1 text-sm border rounded-full transition-colors ${
                                    selectedShapes.includes(size)
                                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                                onClick={() => toggleArrayValue(setSelectedShapes, size)}
                            >
                                {String(size).toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-b pb-3">
                <SectionHeader sectionKey="category" title="Danh mục" />
                {openSections.category && (
                    <div className="flex flex-col gap-2 mt-2">
                        {filtersMeta.categories.map((category) => (
                            <label key={category.id} className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(category.id)}
                                    onChange={() => toggleArrayValue(setSelectedCategories, category.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-700"
                                />
                                <span className="leading-5">{category.name}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-b pb-3">
                <SectionHeader sectionKey="color" title="Màu sắc" />
                {openSections.color && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {filtersMeta.colors.map((color) => {
                            const selected = selectedColors.includes(color);
                            const hex = stringToColor(color);
                            return (
                                <button
                                    key={color}
                                    type="button"
                                    aria-label={`Lọc màu ${color}`}
                                    title={formatLabel(color)}
                                    className={`w-6 h-6 rounded-full border border-gray-200 cursor-pointer text-white text-[10px] font-bold flex items-center justify-center transition-transform hover:scale-110 ${
                                        selected ? 'ring-2 ring-gray-900 ring-offset-1' : ''
                                    }`}
                                    style={{ backgroundColor: hex }}
                                    onClick={() => toggleArrayValue(setSelectedColors, color)}
                                >
                                    {selected ? '✓' : ''}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="border-b pb-3">
                <SectionHeader sectionKey="price" title="Khoảng giá" />
                {openSections.price && (
                    <>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <input
                                type="number"
                                placeholder={String(Math.floor(filtersMeta.min_price || 0))}
                                value={priceRange.min}
                                onChange={(event) => setPriceRange((prev) => ({ ...prev, min: event.target.value }))}
                                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20"
                            />
                            <input
                                type="number"
                                placeholder={String(Math.ceil(filtersMeta.max_price || 0))}
                                value={priceRange.max}
                                onChange={(event) => setPriceRange((prev) => ({ ...prev, max: event.target.value }))}
                                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            {formatPrice(filtersMeta.min_price)}đ - {formatPrice(filtersMeta.max_price)}đ
                        </p>
                    </>
                )}
            </div>

            <div className="border-b pb-3">
                <SectionHeader sectionKey="sale" title="Khuyến mãi" />
                {openSections.sale && (
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">Chỉ hiện sản phẩm sale</span>
                        <button
                            type="button"
                            className={`w-12 h-7 rounded-full p-1 transition-colors ${isSaleOnly ? 'bg-gray-900' : 'bg-gray-300'}`}
                            onClick={() => setIsSaleOnly((prev) => !prev)}
                            aria-label="Bật tắt lọc sản phẩm sale"
                        >
                            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${isSaleOnly ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                )}
            </div>

            <div className="pb-1">
                <SectionHeader sectionKey="rating" title="Đánh giá tối thiểu" />
                {openSections.rating && (
                    <div className="flex flex-col gap-2 mt-2">
                        {[5, 4, 3, 2, 1].map((value) => (
                            <button
                                key={value}
                                type="button"
                                className={`w-full text-left text-sm border rounded-lg px-3 py-2 transition-colors ${
                                    minRating === value
                                        ? 'bg-gray-100 border-gray-800 text-gray-900'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setMinRating(value)}
                            >
                                {'★'.repeat(value)}{'☆'.repeat(5 - value)} <span className="text-xs text-gray-500">trở lên</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
