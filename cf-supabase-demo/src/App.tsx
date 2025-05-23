import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminLogin from './pages/AdminLogin';
import UserLogin from './pages/UserLogin';
import UserRegister from './pages/UserRegister';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import CategoryList from './components/CategoryList';
import CategoryJobs from './components/CategoryJobs';
import JobDisplay from './components/JobDisplay';
import UserProfile from './pages/UserProfile';
import './App.css';

// 首页组件已不再使用，直接使用JobDisplay作为首页
// const Home = () => {
//   return (
//     <div className="home-container">
//       <h1>校园招聘信息平台</h1>
//       <p>这里将展示各种校园招聘信息，帮助学生更好地找到心仪的工作。</p>
//
//       <div className="feature-list">
//         <div className="feature-item">
//           <h3>浏览招聘信息</h3>
//           <p>按类别、发布时间等多种条件筛选招聘信息，方便快捷。</p>
//         </div>
//
//         <div className="feature-item">
//           <h3>收藏与投递</h3>
//           <p>收藏感兴趣的招聘信息，一键投递简历，追踪申请状态。</p>
//         </div>
//
//         <div className="feature-item">
//           <h3>会员专享</h3>
//           <p>会员可以查看更多招聘信息的详细内容，提前获取招聘动态。</p>
//         </div>
//       </div>
//     </div>
//   );
// };

function App() {
  return (
    <Routes>
      {/* 管理员仪表盘路由 - 不包含Header和Footer */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />

      {/* 其他所有路由 - 包含Header和Footer */}
      <Route path="*" element={
        <div className="app">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<CategoryList />} />
              <Route path="/category/:categoryId" element={<CategoryJobs />} />
              <Route path="/jobs" element={<JobDisplay />} />
              <Route path="/login/admin" element={<AdminLogin />} />
              <Route path="/login/user" element={<UserLogin />} />
              <Route path="/register" element={<UserRegister />} />
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/profile" element={<UserProfile />} />
            </Routes>
          </main>
          <Footer />
        </div>
      } />
    </Routes>
  );
}

export default App;