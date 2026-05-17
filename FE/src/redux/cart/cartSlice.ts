import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CartItem {
  id: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
}

interface CartState {
  items: CartItem[];
  totalPrice: number;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  totalPrice: 0,
  loading: false,
  error: null,
};

const getAuthHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
});

const recalcTotal = (items: CartItem[]) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);

const mapServerItem = (row: any): CartItem => ({
  id: row.cart_item_id,
  variantId: row.variant_id,
  name: row.product_name,
  price: parseFloat(row.added_price || row.price || 0),
  quantity: row.quantity,
  image: row.image_url || row.thumbnail_url || "",
  size: row.size,
  color: row.color,
});

// Async thunk: Lay gio hang tu server
export const fetchCartFromAPI = createAsyncThunk(
  "cart/fetchFromAPI",
  async () => {
    const res = await fetch("/api/cart/items", { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Khong the tai gio hang");
    const data = await res.json();
    return (data.data || []).map(mapServerItem) as CartItem[];
  },
);

// Async thunk: Them san pham vao gio hang qua API
export const addToCartAPI = createAsyncThunk(
  "cart/addToCartAPI",
  async (payload: {
    variant_id: string;
    quantity: number;
    added_price: number;
    localItem: CartItem;
  }) => {
    const res = await fetch("/api/cart/add-item", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        variant_id: payload.variant_id,
        quantity: payload.quantity,
        added_price: payload.added_price,
      }),
    });
    if (!res.ok) throw new Error("Khong the them vao gio hang");
    const data = await res.json();
    return {
      ...payload.localItem,
      id: data.data?.id || payload.localItem.id,
    } as CartItem;
  },
);

// Async thunk: Cap nhat so luong item trong gio hang qua API
export const updateCartItemAPI = createAsyncThunk(
  "cart/updateCartItemAPI",
  async (payload: {
    cart_item_id: string;
    quantity: number;
    added_price: number;
  }) => {
    const res = await fetch("/api/cart/update-item", {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Khong the cap nhat gio hang");
    return payload;
  },
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(
        (item) =>
          item.id === action.payload.id ||
          (action.payload.variantId &&
            item.variantId === action.payload.variantId),
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      state.totalPrice = recalcTotal(state.items);
    },

    remoteFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.totalPrice = recalcTotal(state.items);
    },

    updateQuantity(
      state,
      action: PayloadAction<{ id: string; quantity: number }>,
    ) {
      const item = state.items.find((item) => item.id === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
        state.totalPrice = recalcTotal(state.items);
      }
    },

    clearCart(state) {
      state.items = [];
      state.totalPrice = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCartFromAPI.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCartFromAPI.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.totalPrice = recalcTotal(action.payload);
      })
      .addCase(fetchCartFromAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Loi tai gio hang";
      });

    builder
      .addCase(addToCartAPI.pending, (state, action) => {
        state.loading = true;
        const localItem = action.meta.arg.localItem;
        const existing = state.items.find(
          (i) => i.variantId && i.variantId === localItem.variantId,
        );
        if (existing) {
          existing.quantity += localItem.quantity;
        } else {
          state.items.push({ ...localItem, id: `temp_${localItem.variantId}` });
        }
        state.totalPrice = recalcTotal(state.items);
      })
      .addCase(addToCartAPI.fulfilled, (state, action) => {
        state.loading = false;
        const item = state.items.find(
          (i) => i.variantId === action.payload.variantId,
        );
        if (item) {
          item.id = action.payload.id;
        }
      })
      .addCase(addToCartAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Loi them vao gio hang";
      });

    builder
      .addCase(updateCartItemAPI.pending, (state, action) => {
        const { cart_item_id, quantity } = action.meta.arg;
        const item = state.items.find((i) => i.id === cart_item_id);
        if (item) {
          item.quantity = quantity;
          state.totalPrice = recalcTotal(state.items);
        }
      })
      .addCase(updateCartItemAPI.rejected, (state, action) => {
        state.error = action.error.message || "Loi cap nhat gio hang";
      });
  },
});

export const { addToCart, remoteFromCart, updateQuantity, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
