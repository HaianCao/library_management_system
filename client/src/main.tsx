/**
 * ========================================================================
 * REACT ENTRY POINT - ĐIỂM VÀO REACT APPLICATION
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - LIBRARY MANAGEMENT SYSTEM
 * ========================================================================
 * 
 * Entry point chính để mount React application vào DOM.
 * Sử dụng React 18's createRoot API thay vì legacy ReactDOM.render.
 */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";                    // Global CSS với Tailwind styles

// Mount React app vào #root element trong index.html
// Non-null assertion (!) vì chúng ta chắc chắn #root element tồn tại
createRoot(document.getElementById("root")!).render(<App />);
