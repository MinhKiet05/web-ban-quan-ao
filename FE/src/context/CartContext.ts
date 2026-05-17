import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

//Tao action asyn cho viec them san pham vao gio hang
export const  fetchCartItems = createAsyncThunk(
  "cart/fetchCartItems",
  async () => {
    try {
        const response = await fetch(`/api/cart/items`);
        return response.json();
    } catch (error) {
        throw error;
    }
  });


  //Dùng slice
  const cartSlice = createSlice({
    name: "cart",
    initialState: {
      items: [] as any[], loading: false, error: null as string | null
     },
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(fetchCartItems.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(fetchCartItems.fulfilled, (state, action) => {
          state.items = action.payload;
          state.loading = false;
        })
        .addCase(fetchCartItems.rejected, (state, action) => {
          state.error = action.error.message || "Failed to fetch cart items";
          state.loading = false;
        });
    }});

export default cartSlice.reducer;