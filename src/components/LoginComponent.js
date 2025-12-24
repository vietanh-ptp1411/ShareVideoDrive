import React from 'react';

const LoginComponent = ({ onLogin, apiLoaded, userInfo, isLoggedIn }) => {
  return (
    <div className="drive-permission-card">
      <div className="header">
        <div className="header-left">
          <div className="icon-box">🎥</div>
          <div>
            <h1>Chia Sẻ Quyền Truy Cập Video Google Drive</h1>
            <p className="subtitle">Đăng nhập bằng Google</p>
          </div>
        </div>

        {isLoggedIn && userInfo && (
          <div className="login-section">
            <div className="user-info">
              <img src={userInfo?.imageUrl} alt={userInfo?.name} className="user-avatar" />
              <div className="user-details">
                <div className="user-name">{userInfo?.name}</div>
                <div className="user-email">{userInfo?.email}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isLoggedIn && (
        <div className="login-container">
          <div className="login-content">
            <div className="login-icon">🔐</div>
            <h2>Bước 1: Đăng nhập với Google</h2>
            <p>Để sử dụng công cụ này, bạn cần đăng nhập với tài khoản Google của mình.</p>
            <button 
              className="btn btn-login" 
              onClick={onLogin}
              disabled={!apiLoaded}
            >
              {apiLoaded ? 'Đăng nhập bằng Google' : 'Đang tải...'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginComponent;
//cắp cái dcm