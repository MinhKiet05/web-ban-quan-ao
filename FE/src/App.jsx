import { useState } from 'react'
import './App.css'
import Header from './components/header/Header.jsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/homepage/HomePage.jsx';
import ProductPage from './pages/product/ProductPage.jsx';
import AboutUsPage from './pages/aboutUs/AboutUsPage.jsx';
import CartPage from './pages/cartPage/CartPage.jsx';

function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductPage />} />
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </Router>
  )
}

export default App
