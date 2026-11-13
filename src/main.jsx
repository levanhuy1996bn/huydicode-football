import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { setupDevice } from './utils/device'
import { installAudioUnlock } from './utils/sound'

// Phase 29A1: lớp is-touch / is-ios, chiều cao màn hình thật, chặn phóng to
// trong trận, mở khoá âm thanh ở lần chạm đầu.
setupDevice()
installAudioUnlock()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)