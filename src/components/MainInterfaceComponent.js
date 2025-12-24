import React, { useRef, useEffect } from 'react';

const MainInterfaceComponent = ({
  action,
  setAction,
  mode,
  setMode,
  email,
  setEmail,
  videoUrl,
  setVideoUrl,
  videoUrls,
  setVideoUrls,
  onShare,
  loading,
  result,
  userInfo,
  onLogout,
}) => {
  const resultRef = useRef(null);

  // Tự động scroll đến khi message xuất hiện
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result]);

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

        <div className="login-section">
          <div className="user-info">
            <img src={`${process.env.PUBLIC_URL}/Logotron.png`} alt="Logotron" className="user-avatar" />
            <div className="user-details">
              <div className="user-name">{userInfo?.name}</div>
              <div className="user-email">{userInfo?.email}</div>
            </div>
            <button className="btn btn-logout" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div ref={resultRef} className={`result-message ${result.type}`}>
          {result.message}
        </div>
      )}

      <div className="permission-form">
        {/* Hành động - Button Group */}
        <div className="form-group">
          <label>Hành động:</label>
          <div className="button-group">
            <button
              type="button"
              className={`btn-option ${action === 'grant' ? 'active' : ''}`}
              onClick={() => setAction('grant')}
            >
              ✓ Cấp quyền truy cập
            </button>
            <button
              type="button"
              className={`btn-option ${action === 'revoke' ? 'active' : ''}`}
              onClick={() => setAction('revoke')}
            >
              ✕ Gỡ quyền truy cập
            </button>
          </div>
        </div>

        {/* Chế độ - Button Group */}
        <div className="form-group">
          <label>Chế độ:</label>
          <div className="button-group">
            <button
              type="button"
              className={`btn-option ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
            >
              📄 Đơn lẻ
            </button>
            <button
              type="button"
              className={`btn-option ${mode === 'multiple' ? 'active' : ''}`}
              onClick={() => setMode('multiple')}
            >
              📋 Hàng loạt
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Email người nhận:</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email người nhận"
          />
        </div>

        <div className="form-group">
          <label>
            {mode === 'single' ? 'URL hoặc ID video:' : 'Danh sách URL hoặc ID video (mỗi cái một dòng):'}
          </label>
          {mode === 'single' ? (
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Nhập URL hoặc ID video"
            />
          ) : (
            <textarea
              value={videoUrls}
              onChange={(e) => setVideoUrls(e.target.value)}
              placeholder="Nhập danh sách URL hoặc ID video"
            />
          )}
        </div>

        <div className="form-actions">
          <button 
            className="btn btn-share" 
            onClick={onShare} 
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : `Thực hiện ${action === 'grant' ? 'cấp quyền' : 'gỡ quyền'}`}
          </button>
        </div>
      </div>

      <div className="footer">
        <p>Drive Permission App - Phiên bản 1.0</p>
        <p>© 2025 Bản quyền thuộc về nhóm phát triển VA_MVALAB</p>
      </div>
    </div>
  );
};

export default MainInterfaceComponent;
