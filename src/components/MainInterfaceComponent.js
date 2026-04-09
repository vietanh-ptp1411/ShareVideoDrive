import React, { useRef, useEffect, useMemo, useState } from 'react';

const MainInterfaceComponent = ({
  action, setAction, mode, setMode,
  email, setEmail, emails, setEmails,
  videoUrl, setVideoUrl, videoUrls, setVideoUrls,
  folderUrl, setFolderUrl, folderFiles, onLoadFolder,
  onShare, onStop, loading, progress, result,
  detailedResults, onExportCSV,
  userInfo, onLogout,
  savedGroups, onSaveGroup, onLoadGroup, onDeleteGroup,
  onViewPermissions, viewPermissions, permissionsLoading, onClosePermissions,
  onScanEmails,
  darkMode, onToggleDarkMode,
  accessToken, extractVideoId, verifyFile,
}) => {
  const resultRef = useRef(null);
  const [verifiedFiles, setVerifiedFiles] = useState({});
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result]);

  const extractId = (url) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  const uniqueEmailCount = useMemo(() => {
    return new Set(emails.split('\n').map(e => e.trim()).filter(Boolean)).size;
  }, [emails]);

  const uniqueVideoCount = useMemo(() => {
    return new Set(videoUrls.split('\n').map(extractId).filter(Boolean)).size;
  }, [videoUrls]);

  // Paste handler for Excel/Google Sheets
  const handlePaste = (e, setter) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const normalized = pasted.replace(/[\t\r]+/g, '\n');
    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
    const unique = [...new Set(lines)];
    setter(prev => {
      const existing = prev.split('\n').map(l => l.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...unique])];
      return merged.join('\n');
    });
  };

  // Verify videos
  const handleVerifyVideos = async () => {
    const ids = [...new Set(videoUrls.split('\n').map(extractId).filter(Boolean))];
    if (ids.length === 0) return;
    setVerifying(true);
    const results = {};
    for (const id of ids) {
      results[id] = await verifyFile(id);
    }
    setVerifiedFiles(results);
    setVerifying(false);
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

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
            <button className="btn btn-dark-toggle" onClick={onToggleDarkMode} title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="btn btn-logout" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div ref={resultRef} className={`result-message ${result.type}`}>
          {result.message}
          {detailedResults.length > 0 && (
            <button className="btn btn-export" onClick={onExportCSV}>
              📥 Xuất CSV
            </button>
          )}
        </div>
      )}

      {/* Permissions modal */}
      {viewPermissions && (
        <div className="permissions-overlay" onClick={onClosePermissions}>
          <div className="permissions-modal" onClick={e => e.stopPropagation()}>
            <div className="permissions-header">
              <h3>Quyền truy cập: {viewPermissions.fileName}</h3>
              <button className="btn-close" onClick={onClosePermissions}>✕</button>
            </div>
            <table className="permissions-table">
              <thead>
                <tr><th>Email</th><th>Tên</th><th>Vai trò</th><th>Loại</th></tr>
              </thead>
              <tbody>
                {viewPermissions.permissions.map((p, i) => (
                  <tr key={i}>
                    <td>{p.emailAddress || '-'}</td>
                    <td>{p.displayName || '-'}</td>
                    <td>{p.role}</td>
                    <td>{p.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="permission-form">
        {/* Hành động */}
        <div className="form-group">
          <label>Hành động:</label>
          <div className="button-group">
            <button type="button" className={`btn-option ${action === 'grant' ? 'active' : ''}`} onClick={() => setAction('grant')}>
              ✓ Cấp quyền truy cập
            </button>
            <button type="button" className={`btn-option ${action === 'revoke' ? 'active' : ''}`} onClick={() => setAction('revoke')}>
              ✕ Gỡ quyền truy cập
            </button>
          </div>
        </div>

        {/* Chế độ */}
        <div className="form-group">
          <label>Chế độ:</label>
          <div className="button-group">
            <button type="button" className={`btn-option ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>
              📄 Đơn lẻ
            </button>
            <button type="button" className={`btn-option ${mode === 'multiple' ? 'active' : ''}`} onClick={() => setMode('multiple')}>
              📋 Hàng loạt
            </button>
            <button type="button" className={`btn-option ${mode === 'multi-user' ? 'active' : ''}`} onClick={() => setMode('multi-user')}>
              👥 Nhiều người
            </button>
            <button type="button" className={`btn-option ${mode === 'folder' ? 'active' : ''}`} onClick={() => setMode('folder')}>
              📁 Theo folder
            </button>
          </div>
        </div>

        {/* Email section */}
        {(mode === 'multi-user' || mode === 'folder') ? (
          <div className="form-group">
            <label>
              Danh sách email (mỗi email một dòng):
              {uniqueEmailCount > 0 && <span className="count-badge">{uniqueEmailCount} người</span>}
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              onPaste={(e) => handlePaste(e, setEmails)}
              placeholder={"user1@gmail.com\nuser2@gmail.com\nuser3@gmail.com"}
            />
            {/* Email groups */}
            <div className="email-groups">
              <button className="btn btn-small" onClick={() => {
                const name = window.prompt('Đặt tên nhóm:');
                if (name) onSaveGroup(name);
              }}>💾 Lưu nhóm</button>
              {savedGroups.map((group, i) => (
                <span key={i} className="group-pill">
                  <button className="btn btn-small btn-pill" onClick={() => onLoadGroup(i)}>
                    {group.name} ({group.emails.length})
                  </button>
                  <button className="btn btn-tiny btn-delete" onClick={() => onDeleteGroup(i)}>✕</button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label>Email người nhận:</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email người nhận"
            />
          </div>
        )}

        {/* Video section */}
        {mode === 'folder' ? (
          <div className="form-group">
            <label>URL Folder Google Drive:</label>
            <div className="input-with-button">
              <input
                type="text"
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                placeholder="Dán link folder Google Drive"
              />
              <button className="btn btn-verify" onClick={onLoadFolder} disabled={loading}>
                📂 Tải folder
              </button>
            </div>
            {folderFiles.length > 0 && (
              <div className="folder-files-list">
                <div className="folder-files-header">
                  <span className="count-badge">{folderFiles.length} file</span>
                  <button className="btn btn-small btn-scan" onClick={onScanEmails} disabled={permissionsLoading}>
                    {permissionsLoading ? '⏳ Đang quét...' : '🔍 Quét email từ folder'}
                  </button>
                </div>
                <div className="folder-files-scroll">
                  {folderFiles.map((f, i) => (
                    <div key={i} className="folder-file-item">
                      <span className="file-name">{f.name}</span>
                      <button className="btn btn-tiny" onClick={() => onViewPermissions(f.id)} title="Xem quyền">👁️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : mode === 'single' ? (
          <div className="form-group">
            <label>URL hoặc ID video:</label>
            <div className="input-with-button">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Nhập URL hoặc ID video"
              />
              <button className="btn btn-verify" onClick={() => onViewPermissions(videoUrl)} disabled={permissionsLoading || !videoUrl.trim()}>
                👁️ Xem quyền
              </button>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label>
              Danh sách URL hoặc ID video (mỗi cái một dòng):
              {uniqueVideoCount > 0 && <span className="count-badge">{uniqueVideoCount} video</span>}
            </label>
            <textarea
              value={videoUrls}
              onChange={(e) => setVideoUrls(e.target.value)}
              onPaste={(e) => handlePaste(e, setVideoUrls)}
              placeholder="Nhập danh sách URL hoặc ID video"
            />
            <div className="verify-section">
              <button className="btn btn-small btn-verify" onClick={handleVerifyVideos} disabled={verifying}>
                {verifying ? 'Đang kiểm tra...' : '🔍 Kiểm tra video'}
              </button>
              {Object.keys(verifiedFiles).length > 0 && (
                <div className="verified-list">
                  {Object.entries(verifiedFiles).map(([id, info]) => (
                    <div key={id} className={`verified-item ${info ? 'valid' : 'invalid'}`}>
                      {info ? `✅ ${info.name}` : `❌ ${id} - Không tìm thấy`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {loading && progress.total > 0 && (
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="progress-text">
              {progress.current}/{progress.total} ({progressPercent}%) — ✅ {progress.successCount} | ❌ {progress.errorCount} | ⏭️ {progress.skippedCount}
            </div>
          </div>
        )}

        <div className="form-actions">
          {loading ? (
            <button className="btn btn-stop" onClick={onStop}>
              ⏹ Dừng lại
            </button>
          ) : (
            <button className="btn btn-share" onClick={onShare} disabled={loading}>
              {`Thực hiện ${action === 'grant' ? 'cấp quyền' : 'gỡ quyền'}`}
            </button>
          )}
        </div>
      </div>

      <div className="footer">
        <p>Drive Permission App - Phiên bản 2.0</p>
        <p>© 2025 Bản quyền thuộc về nhóm phát triển VA_MVALAB</p>
      </div>
    </div>
  );
};

export default MainInterfaceComponent;
