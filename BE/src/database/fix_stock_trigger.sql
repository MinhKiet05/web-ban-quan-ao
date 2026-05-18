-- =====================================================
-- FIX: update_stock_on_status_change trigger
-- Vấn đề: reserved_qty có thể về âm khi data được import
--         trực tiếp không qua trigger reserve_stock.
-- Fix: dùng GREATEST(0, ...) để tránh vi phạm CHECK constraint.
-- =====================================================

CREATE OR REPLACE FUNCTION update_stock_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE product_variants pv
        SET
            reserved_qty = GREATEST(0, reserved_qty - oi.quantity),
            sold_qty     = sold_qty + oi.quantity,
            stock_qty    = GREATEST(0, stock_qty - oi.quantity)
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND pv.id = oi.variant_id;

        UPDATE products p
        SET sold_count = sold_count + (
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi
            JOIN product_variants pv ON pv.id = oi.variant_id
            WHERE oi.order_id = NEW.id AND pv.product_id = p.id
        )
        WHERE id IN (
            SELECT DISTINCT pv.product_id
            FROM order_items oi
            JOIN product_variants pv ON pv.id = oi.variant_id
            WHERE oi.order_id = NEW.id
        );

        UPDATE users
        SET
            loyalty_points = loyalty_points + COALESCE(NEW.points_earned, 0),
            total_spent    = total_spent + NEW.total,
            total_orders   = total_orders + 1
        WHERE id = NEW.user_id;
    END IF;

    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE product_variants pv
        SET reserved_qty = GREATEST(0, reserved_qty - oi.quantity)
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND pv.id = oi.variant_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
