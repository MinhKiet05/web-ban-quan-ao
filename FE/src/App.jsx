import './App.css';
import Header from './components/header/Header.jsx';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import ScrollToTop from './components/scrollToTop/ScrollToTop.jsx';
import HomePage from './pages/homepage/HomePage.jsx';
import ProductPage from './pages/product/ProductPage.jsx';
import ProductDetail from './pages/productDetail/ProductDetail.jsx';
import AboutUsPage from './pages/aboutUs/AboutUsPage.jsx';
import CartPage from './pages/cartPage/CartPage.jsx';
import CheckoutPage from './pages/checkoutPage/CheckoutPage.jsx';
import Footer from './components/footer/Footer.jsx';
import LoginPage from './pages/loginPage/LoginPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProductProvider } from './context/ProductContext.jsx';
import NotFound from './pages/notFoundPage/NotFound.jsx';
import SearchPage from './pages/searchPage/SearchPage.jsx';
import OrdersPage from './pages/ordersPage/OrdersPage.jsx';
import AdminDashboard from './pages/adminDashboard/AdminDashboard.jsx';
// Cấu trúc Layout để Header và Footer luôn hiển thị ở mọi trang
import MyPage from './pages/myPage/MyPage.jsx';
import ProtectedRoute from './components/protectedRoute/ProtectedRoute.jsx';


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

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <ProductProvider>
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
            {/* Admin — layout riêng, không có Header/Footer */}
            <Route path="admin" element={<AdminDashboard />} />
          </Routes>
        </ProductProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;