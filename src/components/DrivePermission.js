import React, { useState, useEffect } from 'react';
import './DrivePermission.css';

const DrivePermission = () => {
  const [action, setAction] = useState('grant'); // 'grant' or 'revoke'
  const [mode, setMode] = useState('single');
  const [email, setEmail] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUrls, setVideoUrls] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // Google OAuth configuration
    const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
    const API_KEY = process.env.REACT_APP_API_KEY;
  const SCOPES = 'https://www.googleapis.com/auth/drive';

  useEffect(() => {
    loadGoogleAPI();
  }, []);

  const loadGoogleAPI = () => {
    const script1 = document.createElement('script');
    script1.src = 'https://accounts.google.com/gsi/client';
    script1.async = true;
    script1.defer = true;
    script1.onload = () => {
      initializeGIS();
    };
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://apis.google.com/js/api.js';
    script2.async = true;
    script2.defer = true;
    script2.onload = () => {
      window.gapi.load('client', initializeGapiClient);
    };
    document.body.appendChild(script2);
  };

  const initializeGapiClient = async () => {
    try {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
      setApiLoaded(true);
    } catch (error) {
      setApiError(`Lỗi khởi tạo GAPI: ${error.message}`);
    }
  };

  const initializeGIS = () => {
    try {
      window.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            getUserInfo(response.access_token);
          }
        },
      });
    } catch (error) {
      setApiError(`Lỗi khởi tạo GIS: ${error.message}`);
    }
  };

  const getUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUserInfo({
        name: data.name,
        email: data.email,
        imageUrl: data.picture,
      });
      setIsLoggedIn(true);
    } catch (error) {
      setApiError(`Lỗi lấy thông tin user: ${error.message}`);
    }
  };

  const handleLogin = () => {
    if (!window.tokenClient) {
      setResult({ type: 'error', message: 'Google API chưa sẵn sàng. Vui lòng đợi...' });
      return;
    }
    try {
      window.tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      setResult({ type: 'error', message: `Lỗi đăng nhập: ${error.message}` });
    }
  };

  const handleLogout = () => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setIsLoggedIn(false);
        setUserInfo(null);
        setAccessToken(null);
        setResult(null);
      });
    }
  };

  const extractVideoId = (url) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  const shareVideo = async (videoId, targetEmail) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions?sendNotificationEmail=true`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'user',
            role: 'reader',
            emailAddress: targetEmail,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Lỗi không xác định');
      }

      return { success: true, videoId };
    } catch (error) {
      return { success: false, videoId, error: error.message };
    }
  };

  const revokeVideo = async (videoId, targetEmail) => {
    try {
      const listResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions?fields=permissions(id,emailAddress)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!listResponse.ok) {
        const error = await listResponse.json();
        throw new Error(error.error?.message || 'Không thể lấy danh sách quyền');
      }

      const data = await listResponse.json();
      const permission = data.permissions?.find(p => p.emailAddress === targetEmail);

      if (!permission) {
        throw new Error('Không tìm thấy quyền cho email này');
      }

      const deleteResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions/${permission.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(error.error?.message || 'Không thể xóa quyền');
      }

      return { success: true, videoId };
    } catch (error) {
      return { success: false, videoId, error: error.message };
    }
  };

  const handleSharePermission = async () => {
    if (!isLoggedIn) {
      setResult({ type: 'error', message: 'Vui lòng đăng nhập Google trước!' });
      return;
    }

    if (!email.trim()) {
      setResult({ type: 'error', message: 'Vui lòng nhập email người nhận!' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setResult({ type: 'error', message: 'Email không hợp lệ!' });
      return;
    }

    setLoading(true);
    setResult(null);

    const processFunction = action === 'grant' ? shareVideo : revokeVideo;
    const actionText = action === 'grant' ? 'cấp quyền' : 'gỡ quyền';

    if (mode === 'single') {
      if (!videoUrl.trim()) {
        setResult({ type: 'error', message: 'Vui lòng nhập URL hoặc ID video!' });
        setLoading(false);
        return;
      }

      const videoId = extractVideoId(videoUrl);
      const result = await processFunction(videoId, email);

      if (result.success) {
        setResult({
          type: 'success',
          message: `✓ Đã ${actionText} thành công cho ${email}!`,
          details: `Video ID: ${videoId}`,
        });
      } else {
        setResult({
          type: 'error',
          message: `✗ Lỗi khi ${actionText}: ${result.error}`,
          details: `Video ID: ${videoId}`,
        });
      }
    } else {
      if (!videoUrls.trim()) {
        setResult({ type: 'error', message: 'Vui lòng nhập danh sách URL/ID video!' });
        setLoading(false);
        return;
      }

      const urls = videoUrls.split('\n').map((u) => u.trim()).filter((u) => u);
      const videoIds = urls.map(extractVideoId);

      let successCount = 0;
      let failedCount = 0;
      const details = [];

      for (let i = 0; i < videoIds.length; i++) {
        const result = await processFunction(videoIds[i], email);

        if (result.success) {
          successCount++;
          details.push(`✓ Video ${i + 1}/${videoIds.length}: ${videoIds[i]}`);
        } else {
          failedCount++;
          details.push(`✗ Video ${i + 1}/${videoIds.length}: ${videoIds[i]} - ${result.error}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setResult({
        type: successCount > 0 ? 'success' : 'error',
        message: `Hoàn thành! Thành công: ${successCount}/${videoIds.length}, Thất bại: ${failedCount}/${videoIds.length}`,
        details: details.join('\n'),
      });
    }

    setLoading(false);
  };

  return (
    <div className="drive-permission-container">
      <div className="drive-permission-card">
        <div className="header">
          <div className="header-left">
            <div className="icon-box">
              <span>🔗</span>
            </div>
            <div>
              <h1>Video Permission Manager</h1>
              <p className="subtitle">Cấp quyền video Google Drive cho học viên</p>
            </div>
          </div>

          <div className="header-right">
            {isLoggedIn ? (
              <div className="user-info">
                <div className="user-details">
                  <div className="user-name">{userInfo?.name}</div>
                  <div className="user-email">{userInfo?.email}</div>
                </div>
                {userInfo?.imageUrl && (
                  <img src={userInfo.imageUrl} alt="Profile" className="user-avatar" />
                )}
                <button onClick={handleLogout} className="btn btn-logout">
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} disabled={!apiLoaded} className="btn btn-login">
                {apiLoaded ? 'Đăng nhập Google' : 'Đang tải...'}
              </button>
            )}
          </div>
        </div>

        {apiError && (
          <div className="alert alert-error">
            <strong>⚠️ Lỗi cấu hình</strong>
            <p>{apiError}</p>
          </div>
        )}

        {!isLoggedIn ? (
          <div className="login-prompt">
            <div className="login-icon">🔐</div>
            <h2>Vui lòng đăng nhập</h2>
            <p>Đăng nhập bằng tài khoản Google chủ sở hữu video để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Action Selection - CẤP QUYỀN / GỠ QUYỀN */}
            <div className="mode-section">
              <label className="section-label">Hành động</label>
              <div className="mode-buttons">
                <button
                  onClick={() => setAction('grant')}
                  className={`mode-btn ${action === 'grant' ? 'active' : ''}`}
                >
                  <span className="mode-icon">✅</span>
                  <div className="mode-title">Cấp quyền</div>
                  <div className="mode-desc">Cho phép truy cập video</div>
                </button>

                <button
                  onClick={() => setAction('revoke')}
                  className={`mode-btn ${action === 'revoke' ? 'active' : ''}`}
                >
                  <span className="mode-icon">🚫</span>
                  <div className="mode-title">Gỡ quyền</div>
                  <div className="mode-desc">Thu hồi quyền truy cập</div>
                </button>
              </div>
            </div>

            {/* Mode Selection - 1 VIDEO / NHIỀU VIDEO */}
            <div className="mode-section">
              <label className="section-label">
                Chế độ {action === 'grant' ? 'cấp quyền' : 'gỡ quyền'}
              </label>
              <div className="mode-buttons">
                <button
                  onClick={() => setMode('single')}
                  className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
                >
                  <span className="mode-icon">🎬</span>
                  <div className="mode-title">1 Video</div>
                  <div className="mode-desc">
                    {action === 'grant' ? 'Cấp quyền cho 1 video' : 'Gỡ quyền cho 1 video'}
                  </div>
                </button>

                <button
                  onClick={() => setMode('multiple')}
                  className={`mode-btn ${mode === 'multiple' ? 'active' : ''}`}
                >
                  <span className="mode-icon">📚</span>
                  <div className="mode-title">Nhiều Video</div>
                  <div className="mode-desc">
                    {action === 'grant' ? 'Cấp quyền cho nhiều video' : 'Gỡ quyền cho nhiều video'}
                  </div>
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div className="input-section">
              <label className="section-label">📧 Email người nhận</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="input-field"
              />
            </div>

            {/* Video Input */}
            {mode === 'single' ? (
              <div className="input-section">
                <label className="section-label">🔑 Video ID hoặc URL</label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="input-field"
                />
              </div>
            ) : (
              <div className="input-section">
                <label className="section-label">
                  🔑 Danh sách Video URLs/IDs (mỗi video một dòng)
                </label>
                <textarea
                  value={videoUrls}
                  onChange={(e) => setVideoUrls(e.target.value)}
                  placeholder="https://drive.google.com/file/d/...&#10;https://drive.google.com/file/d/..."
                  rows={6}
                  className="input-field textarea"
                />
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleSharePermission}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '⏳ Đang xử lý...' : action === 'grant' ? '🚀 Cấp quyền' : '🗑️ Gỡ quyền'}
            </button>

            {/* Result */}
            {result && (
              <div
                className={`alert ${
                  result.type === 'success' ? 'alert-success' : 'alert-error'
                }`}
              >
                <strong>{result.message}</strong>
                {result.details && <pre className="result-details">{result.details}</pre>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DrivePermission;