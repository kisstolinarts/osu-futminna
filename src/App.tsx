import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import About from './pages/About';
import Announcements from './pages/Announcements';
import AnnouncementDetail from './pages/AnnouncementDetail';
import Events from './pages/Events';
import GalleryPage from './pages/GalleryPage';
import Election from './pages/Election';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import StudentDashboard from './pages/StudentDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import SetPassword from './pages/SetPassword';
import VotingPage from './pages/VotingPage';
import { ContentProvider } from './lib/ContentContext';

export default function App() {
  return (
    <ContentProvider>
      <ScrollToTop />
      <Routes>
        {/* Public site (with shared header/footer) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/announcements/:id" element={<AnnouncementDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/election" element={<Election />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/vote" element={<VotingPage />} />
        </Route>

        {/* Full-screen member / admin flows */}
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ContentProvider>
  );
}
