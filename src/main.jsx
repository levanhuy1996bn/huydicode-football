import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { setupDevice } from './utils/device'
import { installAudioUnlock } from './utils/sound'
import { setupInstall } from './utils/install'

// Phase 29A1: lớp is-touch / is-ios, chiều cao màn hình thật, chặn phóng to
// trong trận, mở khoá âm thanh ở lần chạm đầu.
setupDevice()
installAudioUnlock()
// Phase 29A5: cài như ứng dụng (nút INSTALL, service worker cho bản build).
setupInstall()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)