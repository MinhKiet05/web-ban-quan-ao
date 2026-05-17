import './App.css';
import Header from './components/header/Header.jsx';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import ScrollToTop from './components/scrollToTop/ScrollToTop.jsx';
import HomePage from './pages/homepage/HomePage.jsx';
import ProductPage from './pages/product/ProductPage.jsx';
import ProductDetail from './pages/productDetail/ProductDetail.jsx';
import AboutUsPage from './pages/aboutUs/AboutUsPage.jsx';
import CartPage from './pages/cartPage/CartPage.jsx';
import CheckoutPage from './pages/checkoutPage/CheckoutPage.jsx';
import Footer from './components/footer/Footer.jsx';
import LoginPage from './pages/loginPage/LoginPage.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ProductProvider } from './context/ProductContext.jsx';
import NotFound from './pages/notFoundPage/NotFound.jsx';
import SearchPage from './pages/searchPage/SearchPage.jsx';
import OrdersPage from './pages/ordersPage/OrdersPage.jsx';
import MyPage from './pages/myPage/MyPage.jsx';
import ProtectedRoute from './components/protectedRoute/ProtectedRoute.jsx';

// Loading component hiển thị khi auth đang restore
function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Đang tải ứng dụng...</p>
      </div>
    </div>
  );
}

// Layout component
function Layout() {
  return (
    <>
      <Header />
      <main className="appMain">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

// Routes wrapper - kiểm tra auth loading state
function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="products/:slug" element={<ProductDetail />} />
        <Route path="about-us" element={<AboutUsPage />} />
        <Route path="cart" element={<CartPage />} />
        
        {/* Protected routes */}
        <Route path="checkout" element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />
        <Route path="orders" element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path="my" element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        } />
        
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <ProductProvider>
          <AppRoutes />
        </ProductProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;