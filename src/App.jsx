import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import React from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Profile = React.lazy(() => import('./pages/Profile.jsx'));
const Members = React.lazy(() => import('./pages/Members'));
const Settings = React.lazy(() => import('./pages/Settings'));
const CreatePost = React.lazy(() => import('./pages/CreatePost'));
const CreateGroup = React.lazy(() => import('./pages/CreateGroup'));
const GroupSettings = React.lazy(() => import('./pages/GroupSettings'));
const Feed = React.lazy(() => import('./pages/Feed'));
const CreateStory = React.lazy(() => import('./pages/CreateStory'));
const Bible = React.lazy(() => import('./pages/Bible'));
const Games = React.lazy(() => import('./pages/Games'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminManageData = React.lazy(() => import('./pages/AdminManageData'));
const Friends = React.lazy(() => import('./pages/Friends'));
const Posts = React.lazy(() => import('./pages/Posts'));
const Home = React.lazy(() => import('./pages/Home'));
const VideoCalls = React.lazy(() => import('./pages/VideoCalls'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Activity = React.lazy(() => import('./pages/Activity'));
const GroupEvents = React.lazy(() => import('./pages/GroupEvents'));
const LiveStreams = React.lazy(() => import('./pages/LiveStreams'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const CreatorProfile = React.lazy(() => import('./pages/CreatorProfile'));
const Reels = React.lazy(() => import('./pages/Reels'));
const Discover = React.lazy(() => import('./pages/Discover'));
const Contacts = React.lazy(() => import('./pages/Contacts'));
const CommunityGuidelines = React.lazy(() => import('./pages/CommunityGuidelines'));
// Add page imports here


const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading Kingdom Advancers...</p>
        </div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
    // Show generic error fallback
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 p-6 text-center max-w-sm">
          <p className="text-lg font-semibold text-foreground">Unable to Load App</p>
          <p className="text-sm text-muted-foreground">{authError.message || 'Please try refreshing the page.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Render the main app with error boundary
  return (
    <React.Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading app...</p>
        </div>
      </div>
    }>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Profile />} />
          <Route path="/Profile" element={<Profile />} />
          <Route path="/Members" element={<Members />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="/CreatePost" element={<CreatePost />} />
          <Route path="/CreateGroup" element={<CreateGroup />} />
          <Route path="/GroupSettings" element={<GroupSettings />} />
          <Route path="/Feed" element={<Feed />} />
          <Route path="/CreateStory" element={<CreateStory />} />
          <Route path="/Bible" element={<Bible />} />
          <Route path="/Games" element={<Games />} />
          <Route path="/AdminDashboard" element={<AdminDashboard />} />
          <Route path="/AdminManageData" element={<AdminManageData />} />
          <Route path="/Friends" element={<Friends />} />
          <Route path="/Posts" element={<Posts />} />
          <Route path="/Home" element={<Home />} />
          <Route path="/VideoCalls" element={<VideoCalls />} />
          <Route path="/Chat" element={<Chat />} />
          <Route path="/Activity" element={<Activity />} />
          <Route path="/GroupEvents" element={<GroupEvents />} />
          <Route path="/LiveStreams" element={<LiveStreams />} />
          <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
          <Route path="/CreatorProfile" element={<CreatorProfile />} />
          <Route path="/Reels" element={<Reels />} />
          <Route path="/Discover" element={<Discover />} />
          <Route path="/Contacts" element={<Contacts />} />
          <Route path="/CommunityGuidelines" element={<CommunityGuidelines />} />
          {/* Add your page Route elements here */}
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </React.Suspense>
  );
};


function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App