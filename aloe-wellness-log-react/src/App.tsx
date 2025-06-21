import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import RecordInput from './pages/RecordInput';
import RecordList from './pages/RecordList';
import RecordGraph from './pages/RecordGraph';
import RecordCalendar from './pages/RecordCalendar';
import RecordExport from './pages/RecordExport';
import ToastContainer from './components/ToastContainer';
import { useRecordsStore } from './store/records';
import './App.css'

function App() {
  const { initializeFields } = useRecordsStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    initializeFields();
  }, [initializeFields]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <ToastContainer />
      <Router>
        <div className="relative">
          {/* デスクトップ用ナビゲーション */}
          <nav className="hidden md:flex gap-4 mb-12 p-4 bg-white rounded-lg shadow-lg mx-4 mt-4">
            <Link to="/" className="bg-green-600 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 font-medium text-base border-2 border-green-600 hover:border-green-700 hover:!text-white visited:!text-white active:!text-white">入力</Link>
            <Link to="/list" className="bg-blue-500 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium text-base border-2 border-blue-500 hover:border-blue-600 hover:!text-white visited:!text-white active:!text-white">一覧</Link>
            <Link to="/graph" className="bg-blue-500 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium text-base border-2 border-blue-500 hover:border-blue-600 hover:!text-white visited:!text-white active:!text-white">グラフ</Link>
            <Link to="/calendar" className="bg-blue-500 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200 font-medium text-base border-2 border-blue-500 hover:border-blue-600 hover:!text-white visited:!text-white active:!text-white">カレンダー</Link>
            <Link to="/export" className="bg-purple-600 !text-white px-4 py-2 rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200 font-medium text-base border-2 border-purple-600 hover:border-purple-700 hover:!text-white visited:!text-white active:!text-white">管理</Link>
          </nav>

          {/* モバイル用ハンバーガーボタン */}
          <div className="md:hidden flex justify-end mb-4 p-4">
            <button
              onClick={toggleMenu}
              className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="メニューを開く"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <div className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                <div className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
              </div>
            </button>
          </div>

          {/* モバイル用メニュー */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-4 right-4 bg-white rounded-lg shadow-lg z-50 mb-4">
              <nav className="flex flex-col">
                <Link to="/" onClick={closeMenu} className="px-4 py-3 !text-green-600 font-medium text-base hover:bg-green-50 border-b border-gray-100 transition-colors duration-200 hover:!text-green-600 visited:!text-green-600 active:!text-green-600">入力</Link>
                <Link to="/list" onClick={closeMenu} className="px-4 py-3 !text-blue-500 font-medium text-base hover:bg-blue-50 border-b border-gray-100 transition-colors duration-200 hover:!text-blue-500 visited:!text-blue-500 active:!text-blue-500">一覧</Link>
                <Link to="/graph" onClick={closeMenu} className="px-4 py-3 !text-blue-500 font-medium text-base hover:bg-blue-50 border-b border-gray-100 transition-colors duration-200 hover:!text-blue-500 visited:!text-blue-500 active:!text-blue-500">グラフ</Link>
                <Link to="/calendar" onClick={closeMenu} className="px-4 py-3 !text-blue-500 font-medium text-base hover:bg-blue-50 border-b border-gray-100 transition-colors duration-200 hover:!text-blue-500 visited:!text-blue-500 active:!text-blue-500">カレンダー</Link>
                <Link to="/export" onClick={closeMenu} className="px-4 py-3 !text-purple-600 font-medium text-base hover:bg-purple-50 transition-colors duration-200 hover:!text-purple-600 visited:!text-purple-600 active:!text-purple-600">管理</Link>
              </nav>
            </div>
          )}

          {/* オーバーレイ（メニューが開いている時） */}
          {isMenuOpen && (
            <div
              className="md:hidden fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              onClick={closeMenu}
            ></div>
          )}
        </div>

        <div className="px-4">
          <Routes>
            <Route path="/" element={<RecordInput />} />
            <Route path="/list" element={<RecordList />} />
            <Route path="/graph" element={<RecordGraph />} />
            <Route path="/calendar" element={<RecordCalendar />} />
            <Route path="/export" element={<RecordExport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
