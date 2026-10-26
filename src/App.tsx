import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppProvider } from './store/app';
import { Layout } from './components/Layout';
import { Splash } from './components/PageFallback';

const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const Discover = lazy(() => import('./pages/Discover'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const EventForm = lazy(() => import('./pages/EventForm'));
const Activity = lazy(() => import('./pages/Activity'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Auth = lazy(() => import('./pages/Auth'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const SafetyAck = lazy(() => import('./pages/SafetyAck'));
const Info = lazy(() => import('./pages/Info'));
const Admin = lazy(() => import('./pages/Admin'));
const VerifyOrg = lazy(() => import('./pages/VerifyOrg'));
const UserPage = lazy(() => import('./pages/UserPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppProvider fallback={<Splash />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="explore" element={<Explore />} />
              <Route path="discover" element={<Discover />} />
              <Route path="events/new" element={<EventForm />} />
              <Route path="events/:id" element={<EventDetail />} />
              <Route path="events/:id/edit" element={<EventForm />} />
              <Route path="activity" element={<Activity />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="login" element={<Auth mode="login" />} />
              <Route path="signup" element={<Auth mode="signup" />} />
              <Route path="reset" element={<Auth mode="reset" />} />
              <Route path="complete-profile" element={<Auth mode="complete" />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="safety-ack" element={<SafetyAck />} />
              <Route path="safety" element={<Info page="safety" />} />
              <Route path="guidelines" element={<Info page="guidelines" />} />
              <Route path="privacy" element={<Info page="privacy" />} />
              <Route path="admin" element={<Admin />} />
              <Route path="verify-org" element={<VerifyOrg />} />
              <Route path="u/:uid" element={<UserPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
