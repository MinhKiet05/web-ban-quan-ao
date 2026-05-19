import React, { useState, useEffect } from 'react'
import styles from './NotFound.module.css';

import { Link, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function NotFound() {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown === 0) {
      navigate('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, navigate]);

  return (
    <div className={styles.notFoundPage}>
      <div className={styles.notFoundContent}>
        <div>
          <img src="/notFound.webp" alt="Not Found" /></div>
        <div className={styles.textContent}>
          <h1>Oops!</h1>
          <h2>Chúng tôi không tìm thấy trang bạn đang tìm kiếm.</h2>
          
          <Link to="/"><button className={styles.goBackButton}> <FontAwesomeIcon icon={faArrowLeft} /> &nbsp; Quay lại trang chủ</button></Link>
          <p>Bạn sẽ được chuyển hướng đến <Link to="/">trang chủ</Link> sau <strong>{countdown}</strong> giây.</p>
        </div>
      </div>
    </div>
  )
}
