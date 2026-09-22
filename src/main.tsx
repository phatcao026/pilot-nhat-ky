import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

document.title = 'Nhật Ký Ngôn Ngữ · Dự án nghiên cứu'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
