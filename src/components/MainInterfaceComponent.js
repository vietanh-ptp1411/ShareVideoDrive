import React, { useRef, useEffect, useMemo } from 'react';

const MainInterfaceComponent = ({
  action,
  setAction,
  mode,
  setMode,
  email,
  setEmail,
  emails,
  setEmails,
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

  const extractVideoId = (url) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  const uniqueEmailCount = useMemo(() => {
    return new Set(emails.split('\n').map(e => e.trim()).filter(Boolean)).size;
  }, [emails]);

  const uniqueVideoCount = useMemo(() => {
    return new Set(videoUrls.split('\n').map(extractVideoId).filter(Boolean)).size;
  }, [videoUrls]);

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
            <button
              type="button"
              className={`btn-option ${mode === 'multi-user' ? 'active' : ''}`}
              onClick={() => setMode('multi-user')}
            >
              👥 Nhiều người
            </button>
          </div>
        </div>

        {mode === 'multi-user' ? (
          <>
            <div className="form-group">
              <label>
                Danh sách email (mỗi email một dòng):
                {uniqueEmailCount > 0 && <span className="count-badge">{uniqueEmailCount} người</span>}
              </label>
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder={"user1@gmail.com\nuser2@gmail.com\nuser3@gmail.com"}
              />
            </div>
            <div className="form-group">
              <label>
                Danh sách URL hoặc ID video (mỗi cái một dòng):
                {uniqueVideoCount > 0 && <span className="count-badge">{uniqueVideoCount} video</span>}
              </label>
              <textarea
                value={videoUrls}
                onChange={(e) => setVideoUrls(e.target.value)}
                placeholder="Nhập danh sách URL hoặc ID video"
              />
            </div>
          </>
        ) : (
          <>
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
                {mode === 'single' ? 'URL hoặc ID video:' : (
                  <>
                    Danh sách URL hoặc ID video (mỗi cái một dòng):
                    {uniqueVideoCount > 0 && <span className="count-badge">{uniqueVideoCount} video</span>}
                  </>
                )}
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
          </>
        )}

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
