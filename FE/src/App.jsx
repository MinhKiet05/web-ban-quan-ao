import './App.css'
import Header from './components/header/Header.jsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/homepage/HomePage.jsx';
import ProductPage from './pages/product/ProductPage.jsx';
import AboutUsPage from './pages/aboutUs/AboutUsPage.jsx';
import CartPage from './pages/cartPage/CartPage.jsx';
import LoginPage from './pages/loginPage/LoginPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductPage />} />
          <Route path="/about-us" element={<AboutUsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
