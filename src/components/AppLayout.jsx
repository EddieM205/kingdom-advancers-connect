import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import TermsAcceptanceModal, { useTermsAccepted } from '@/components/TermsAcceptanceModal';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import useScrollRestoration from "@/hooks/useScrollRestoration";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { Hash, Users, Menu, Loader2, User, LogOut, Settings, Bell, Circle, PlusCircle, Home, BookOpen, Gamepad2, LayoutDashboard, Film, Video, MessageSquare, ChevronLeft, UserPlus, UserCheck, Heart, MessageCircle, AtSign, Swords, UserMinus, Phone, CheckCheck, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { detectNotifType, NOTIF_TYPES } from "@/lib/notifications";
import { initOneSignal, setOneSignalUser, clearOneSignalUser } from "@/lib/oneSignal";
import SmartSearch from "@/components/layout/SmartSearch";
import StoryReel from "@/components/stories/StoryReel";
import IncomingCallModal from "@/components/calls/IncomingCallModal";

const themes = {
    sunset_flare: { sidebar: 'bg-gradient-to-br from-yellow-400 via-red-500 to-indigo-900 border-indigo-900', navbar: 'bg-gradient-to-r from-red-900 via-gray-800 to-black border-black', buttonHover: 'hover:bg-white/10' },
    oceanic_deep: { sidebar: 'bg-gradient-to-br from-green-300 via-blue-500 to-purple-600 border-purple-700', navbar: 'bg-gray-900 border-gray-900', buttonHover: 'hover:bg-white/10' },
    royal_gold: { sidebar: 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-600 border-violet-700', navbar: 'bg-gradient-to-r from-amber-400 to-yellow-600 border-yellow-700', buttonHover: 'hover:bg-black/20' },
    forest_whisper: { sidebar: 'bg-gradient-to-br from-gray-700 via-gray-900 to-black border-black', navbar: 'bg-gradient-to-r from-green-500 to-green-700 border-green-800', buttonHover: 'hover:bg-white/10' },
    candy_pop: { sidebar: 'bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 border-indigo-600', navbar: 'bg-gradient-to-r from-rose-400 to-pink-600 border-pink-700', buttonHover: 'hover:bg-white/10' },
    monochrome: { sidebar: 'bg-gray-800 border-gray-900', navbar: 'bg-black border-black', buttonHover: 'hover:bg-white/10' },
    crimson_dawn: { sidebar: 'bg-gradient-to-br from-red-600 via-orange-500 to-red-700 border-red-800', navbar: 'bg-gray-900 border-gray-900', buttonHover: 'hover:bg-white/10' },
    azure_dream: { sidebar: 'bg-gradient-to-br from-sky-400 to-blue-600 border-blue-700', navbar: 'bg-slate-800 border-slate-900', buttonHover: 'hover:bg-white/10' },
    emerald_isle: { sidebar: 'bg-gradient-to-br from-emerald-500 to-teal-700 border-teal-800', navbar: 'bg-gray-900 border-gray-900', buttonHover: 'hover:bg-white/10' },
    amethyst_haze: { sidebar: 'bg-gradient-to-br from-purple-500 to-fuchsia-600 border-fuchsia-700', navbar: 'bg-indigo-900 border-indigo-900', buttonHover: 'hover:bg-white/10' },
    golden_hour: { sidebar: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 border-orange-700', navbar: 'bg-stone-800 border-stone-900', buttonHover: 'hover:bg-white/10' },
    cyberpunk_neon: { sidebar: 'bg-gradient-to-br from-pink-500 via-purple-600 to-cyan-500 border-cyan-600', navbar: 'bg-black border-black', buttonHover: 'hover:bg-white/10' },
    arctic_night: { sidebar: 'bg-gradient-to-br from-slate-800 via-blue-900 to-black border-black', navbar: 'bg-slate-900 border-slate-900', buttonHover: 'hover:bg-white/10' },
    desert_mirage: { sidebar: 'bg-gradient-to-br from-amber-600 via-yellow-700 to-orange-800 border-orange-900', navbar: 'bg-blue-900 border-blue-900', buttonHover: 'hover:bg-white/10' },
    vintage_paper: { sidebar: 'bg-gradient-to-br from-orange-100 to-amber-200 border-amber-300', navbar: 'bg-stone-700 border-stone-800', buttonHover: 'hover:bg-black/20' },
    sakura_blossom: { sidebar: 'bg-gradient-to-br from-pink-200 to-rose-300 border-rose-400', navbar: 'bg-rose-800 border-rose-900', buttonHover: 'hover:bg-white/10' },
};

const pageNameMap = {
  '/': 'Profile',
  '/Profile': 'Profile',
  '/Members': 'Members',
  '/Settings': 'Settings',
  '/CreatePost': 'Create Post',
  '/CreateGroup': 'Create Group',
  '/GroupSettings': 'Group Settings',
  '/Feed': 'Stories',
  '/CreateStory': 'Create Story',
  '/Bible': 'Bible',
  '/Games': 'Games',
  '/AdminDashboard': 'Admin Dashboard',
  '/AdminManageData': 'Admin Manage Data',
  '/Friends': 'Contacts',
  '/Contacts': 'Contacts',
  '/Posts': 'Home',
  '/Home': 'Home',
  '/VideoCalls': 'Video Calls',
  '/LiveStreams': 'Live',
  '/Chat': 'Chat',
  '/Activity': 'Activity',
  '/GroupEvents': 'Group Events',
  };

// Map each bottom-tab root to its tab key
const TAB_ROOTS = {
  '/Posts': 'home',
  '/':      'home',
  '/Feed':  'stories',
  '/Chat':  'chat',
  '/Bible': 'bible',
  '/Profile': 'profile',
};

const BOTTOM_TABS = [
  { key: 'home',    root: '/Posts',   icon: Home,          label: 'Home' },
  { key: 'stories', root: '/Feed',    icon: Film,          label: 'Stories' },
  { key: 'chat',    root: '/Chat',    icon: MessageSquare, label: 'Chat' },
  { key: 'bible',   root: '/Bible',   icon: BookOpen,      label: 'Bible' },
  { key: 'profile', root: '/Profile', icon: User,          label: 'Profile' },
];

/** Returns the tab key that "owns" a given pathname */
function getActiveTab(pathname) {
  // Exact match first
  if (TAB_ROOTS[pathname]) return TAB_ROOTS[pathname];
  // Fall back: which tab's root is a prefix? Longest match wins.
  let best = null;
  let bestLen = 0;
  for (const [root, key] of Object.entries(TAB_ROOTS)) {
    if (root === '/') continue;
    if (pathname.startsWith(root) && root.length > bestLen) {
      best = key;
      bestLen = root.length;
    }
  }
  return best || 'home';
}

const rootPaths = ['/', '/Posts', '/Feed', '/Chat', '/Bible', '/Games', '/Profile'];

const GroupList = ({ groups, onGroupSelect, activeGroupId, unreadGroups }) => (
    <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {groups.map((group) => (
            <button
                key={group.id}
                onClick={() => onGroupSelect(group)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                    activeGroupId === group.id ? "bg-black/20 text-white" : "text-white/80 hover:bg-black/10"
                }`}
            >
                <Avatar className="w-8 h-8 mr-3">
                    <AvatarImage src={group.cover_photo_url} className="object-cover" />
                    <AvatarFallback className="bg-black/20 text-white font-bold">
                        {group.type === 'dm' ? <User className="w-4 h-4"/> : <Hash className="w-4 h-4" />}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate text-left">
                    <span className="block">{group.name.startsWith('DM with') ? group.name.substring(8) : group.name}</span>
                    {group.type === 'group' && <span className="block text-xs opacity-70 truncate">{group.description}</span>}
                </div>
                {unreadGroups.includes(group.id) && <Circle className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 fill-white text-white" />}
            </button>
        ))}
    </nav>
);

const NOTIF_ICON_MAP = {
  [NOTIF_TYPES.MESSAGE]:       { Icon: MessageSquare, cls: 'text-blue-400' },
  [NOTIF_TYPES.FOLLOW]:        { Icon: UserPlus,       cls: 'text-green-400' },
  [NOTIF_TYPES.FOLLOW_REQ]:    { Icon: UserPlus,       cls: 'text-amber-400' },
  [NOTIF_TYPES.FOLLOW_ACCEPT]: { Icon: UserCheck,      cls: 'text-green-500' },
  [NOTIF_TYPES.REACTION]:      { Icon: Heart,          cls: 'text-rose-400' },
  [NOTIF_TYPES.COMMENT]:       { Icon: MessageCircle,  cls: 'text-indigo-400' },
  [NOTIF_TYPES.MENTION]:       { Icon: AtSign,         cls: 'text-purple-400' },
  [NOTIF_TYPES.CHALLENGE]:     { Icon: Swords,         cls: 'text-orange-400' },
  [NOTIF_TYPES.GROUP_INVITE]:  { Icon: Users,          cls: 'text-teal-400' },
  [NOTIF_TYPES.GROUP_REMOVE]:  { Icon: UserMinus,      cls: 'text-red-400' },
  [NOTIF_TYPES.CALL]:          { Icon: Phone,          cls: 'text-emerald-400' },
  [NOTIF_TYPES.GENERAL]:       { Icon: Bell,           cls: 'text-gray-400' },
};

const Notifications = ({ buttonHoverClass }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const all = await base44.entities.Notification.filter({ recipient_id: me.email, is_read: false }, '-created_date', 20);
      return all.filter(n => !n.content?.startsWith('__CALL__:'));
    },
    enabled: !!me,
    refetchInterval: 15000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notifId) => base44.entities.Notification.update(notifId, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.allSettled(notifications.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['all_notifications', me?.email] });
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative text-white ${buttonHoverClass}`}>
          <Bell className="w-5 h-5"/>
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400 ring-2 ring-white"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm p-0 bg-card border-border shadow-xl" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">
            Notifications
            {notifications.length > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{notifications.length}</span>
            )}
          </span>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>}
          {!isLoading && notifications.length === 0 && (
            <div className="py-8 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No new notifications</p>
            </div>
          )}
          {notifications.map(notif => {
            const type = detectNotifType(notif);
            const { Icon, cls } = NOTIF_ICON_MAP[type] || NOTIF_ICON_MAP[NOTIF_TYPES.GENERAL];
            return (
              <div
                key={notif.id}
                className="flex gap-3 px-3 py-2.5 hover:bg-accent cursor-pointer border-b border-border/50 last:border-0"
                onClick={() => {
                  markAsReadMutation.mutate(notif.id);
                  if (notif.link) navigate(notif.link);
                }}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={notif.sender_avatar} />
                    <AvatarFallback className="text-xs">{notif.content?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 bg-card rounded-full p-0.5">
                    <Icon className={`w-3 h-3 ${cls}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug font-medium line-clamp-2">{notif.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border">
          <Link to="/Activity" className="block text-center text-xs text-muted-foreground hover:text-foreground py-2.5 transition-colors">
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPageName = pageNameMap[location.pathname] || '';
    const { accepted: termsAccepted, accept: acceptTerms } = useTermsAccepted();
    const queryClient = useQueryClient();
    const [activeGroup, setActiveGroup] = useState(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [unreadGroups] = useState([]);

    const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
    const activeTheme = themes[me?.theme] || themes.sunset_flare;

    // Register service worker + request notification permission
    usePushNotifications();

    // Initialize OneSignal for offline push notifications
    useEffect(() => { initOneSignal(); }, []);
    useEffect(() => {
      if (me?.email) setOneSignalUser(me.email);
    }, [me?.email]);

    const [incomingCall, setIncomingCall] = useState(null);

    // Poll for incoming call notifications
    const { data: callNotifs = [] } = useQuery({
      queryKey: ['incoming-call-notifs'],
      queryFn: async () => {
        if (!me) return [];
        const notifs = await base44.entities.Notification.filter(
          { recipient_id: me.email, is_read: false },
          '-created_date',
          5
        );
        return notifs.filter(n => n.content?.startsWith('__CALL__:'));
      },
      enabled: !!me,
      refetchInterval: 3000,
    });

    useEffect(() => {
      if (callNotifs.length > 0 && !incomingCall) {
        try {
          const raw = callNotifs[0].content.replace('__CALL__:', '');
          const callData = JSON.parse(raw);
          const ageSeconds = (Date.now() - new Date(callNotifs[0].created_date).getTime()) / 1000;
          if (ageSeconds < 60) {
            setIncomingCall({ ...callData, notifId: callNotifs[0].id });
          } else {
            base44.entities.Notification.update(callNotifs[0].id, { is_read: true }).catch(() => {});
          }
        } catch (e) {}
      }
    }, [callNotifs]);

    const handleAcceptCall = () => {
      if (incomingCall) {
        base44.entities.Notification.update(incomingCall.notifId, { is_read: true }).catch(() => {});
        const roomId = incomingCall.roomId || incomingCall.roomName;
        const params = new URLSearchParams({
          roomId,
          callType: incomingCall.callType || 'video',
        });
        if (incomingCall.isGroupCall) {
          params.set('isGroup', 'true');
          params.set('groupName', incomingCall.groupName || 'Group Call');
        } else {
          params.set('isCaller',     'false');
          params.set('remoteName',   incomingCall.callerName   || '');
          params.set('remoteAvatar', incomingCall.callerAvatar || '');
          params.set('remoteEmail',  incomingCall.callerEmail  || '');
        }
        navigate(`/VideoCalls?${params.toString()}`);
        setIncomingCall(null);
      }
    };

    const handleDeclineCall = () => {
      if (incomingCall) {
        base44.entities.Notification.update(incomingCall.notifId, { is_read: true }).catch(() => {});
        setIncomingCall(null);
      }
    };

    const isUserAdminOfActiveGroup = useMemo(() => {
        if (!me || !activeGroup || activeGroup.type === 'dm') return false;
        return activeGroup.admins?.includes(me.email);
    }, [me, activeGroup]);

    // System-aware dark mode
    useEffect(() => {
        const applyTheme = () => {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };
        applyTheme();
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', applyTheme);
        return () => mq.removeEventListener('change', applyTheme);
    }, []);

    const { data: groups = [], isLoading: groupsLoading } = useQuery({
        queryKey: ["groups"],
        queryFn: () => base44.entities.Group.list(),
    });

    useEffect(() => {
        if (!activeGroup && groups.length > 0 && (currentPageName === 'Home' || !currentPageName)) {
            setActiveGroup(groups[0]);
        }
    }, [groups, activeGroup, currentPageName]);

    const handleGroupSelect = (group) => {
        setActiveGroup(group);
        setIsSheetOpen(false);
        navigate(`/Chat?groupId=${group.id}`);
    };

    // ─── Per-tab history stacks ────────────────────────────────────────────────
    // Stores the last-visited path for each tab so we can restore it on re-select.
    const tabMemory = useRef({
        home:    '/Posts',
        stories: '/Feed',
        chat:    '/Chat',
        bible:   '/Bible',
        profile: '/Profile',
    });

    const activeTab = getActiveTab(location.pathname);
    const isRootPath = rootPaths.includes(location.pathname);

    // Keep tabMemory in sync whenever location changes
    useEffect(() => {
        const tab = getActiveTab(location.pathname);
        tabMemory.current[tab] = location.pathname + location.search;
    }, [location.pathname, location.search]);

    const handleTabPress = useCallback((tab) => {
        if (tab.key === activeTab) {
            // Tapping the active tab → go to its root (scroll-to-top / reset)
            if (location.pathname !== tab.root) {
                navigate(tab.root, { replace: true });
            } else {
                // Already at root, scroll to top
                scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            // Switch to tab — restore last visited path within that tab
            const dest = tabMemory.current[tab.key] || tab.root;
            navigate(dest);
        }
    }, [activeTab, location.pathname, navigate]);

    // ─── Pull-to-refresh ──────────────────────────────────────────────────────
    const scrollRef = useRef(null);
    useScrollRestoration(scrollRef);
    const pullStartY = useRef(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const PULL_THRESHOLD = 70;

    const handleTouchStart = useCallback((e) => {
        if (scrollRef.current?.scrollTop === 0) {
            pullStartY.current = e.touches[0].clientY;
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (pullStartY.current === null) return;
        const delta = e.touches[0].clientY - pullStartY.current;
        if (delta > 0) setPullDistance(Math.min(delta, PULL_THRESHOLD * 1.5));
    }, []);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            await queryClient.invalidateQueries();
            setTimeout(() => {
                setIsRefreshing(false);
                setPullDistance(0);
            }, 800);
        } else {
            setPullDistance(0);
        }
        pullStartY.current = null;
    }, [pullDistance, isRefreshing, queryClient]);

    const SidebarContent = ({ showProfile = false }) => (
        <div className={`flex flex-col h-full text-white border-r ${activeTheme.sidebar}`}>
            <Link to="/Posts" onClick={() => setIsSheetOpen(false)} className="p-4 border-b border-white/20 hover:bg-black/10 transition-colors">
                <h1 className="text-xl font-bold text-white">Kingdom Advancers</h1>
            </Link>
            <nav className="flex flex-col p-2 space-y-0.5">
                <Link to="/Posts" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <Home className="w-4 h-4 mr-3 flex-shrink-0"/> Posts
                </Link>
                <Link to="/Feed" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <Film className="w-4 h-4 mr-3 flex-shrink-0"/> Stories
                </Link>
                <Link to="/Contacts" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <Users className="w-4 h-4 mr-3 flex-shrink-0"/> Contacts
                </Link>
                <Link to="/Bible" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <BookOpen className="w-4 h-4 mr-3 flex-shrink-0"/> Bible
                </Link>
                <Link to="/Games" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <Gamepad2 className="w-4 h-4 mr-3 flex-shrink-0"/> Games
                </Link>
                <Link to="/VideoCalls" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <Video className="w-4 h-4 mr-3 flex-shrink-0"/> Video Calls
                </Link>
                <Link to="/LiveStreams" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <RadioTower className="w-4 h-4 mr-3 flex-shrink-0"/> Live
                </Link>
                <Link to="/Chat" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0"/> Chat
                </Link>
                <Link to="/Activity" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <Bell className="w-4 h-4 mr-3 flex-shrink-0"/> Activity
                </Link>
                <Link to="/Reels" onClick={() => setIsSheetOpen(false)} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10">
                    <Film className="w-4 h-4 mr-3 flex-shrink-0"/> Reels
                </Link>
            </nav>
            <div className="p-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center">
                        <Hash className="w-4 h-4 mr-2"/>Conversations
                    </h2>
                    <Link to="/CreateGroup" onClick={() => setIsSheetOpen(false)}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:bg-black/10 hover:text-white">
                            <PlusCircle className="w-5 h-5" />
                        </Button>
                    </Link>
                </div>
                {groupsLoading ? (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                ) : (
                    <GroupList groups={groups} onGroupSelect={handleGroupSelect} activeGroupId={activeGroup?.id} unreadGroups={unreadGroups} />
                )}
            </div>

            {/* Desktop-only profile card at sidebar bottom */}
            {showProfile && me && (
                <div className="border-t border-white/20 p-3 flex-shrink-0">
                    <Link
                        to="/Profile"
                        onClick={() => setIsSheetOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-black/10 transition-colors group"
                    >
                        <div className="relative flex-shrink-0">
                            <Avatar className="w-9 h-9">
                                <AvatarImage src={me.avatar_url} className="object-cover" />
                                <AvatarFallback className="bg-black/20 text-white text-sm font-bold">
                                    {me.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white/20" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{me.full_name}</p>
                            <p className="text-xs text-white/60 truncate">@{me.full_name?.toLowerCase().replace(/\s+/g, '_')}</p>
                        </div>
                        <Settings className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors flex-shrink-0" />
                    </Link>
                </div>
            )}
        </div>
    );

    return (
        <div className="h-screen w-full flex bg-gray-50 dark:bg-gray-950 text-foreground overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0">
                <SidebarContent showProfile />
            </aside>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <main className="flex-1 md:pl-80 flex flex-col">
                    <header className={`flex-shrink-0 text-white border-b ${activeTheme.navbar} flex flex-col safe-area-header`}>
                        <div className="h-14 sm:h-16 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 lg:px-8">
                            {/* Left: nav icon + page title */}
                            <div className="flex items-center gap-1 shrink-0 min-w-0 max-w-[35%]">
                                {/* Mobile: Back button on child routes, hamburger on root */}
                                {!isRootPath ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`md:hidden text-white flex-shrink-0 ${activeTheme.buttonHover}`}
                                        onClick={() => navigate(-1)}
                                    >
                                        <ChevronLeft className="h-6 w-6" />
                                    </Button>
                                ) : (
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className={`md:hidden text-white flex-shrink-0 ${activeTheme.buttonHover}`}>
                                            <Menu className="h-6 w-6" />
                                        </Button>
                                    </SheetTrigger>
                                )}
                                {false && activeGroup && currentPageName === 'Home' ? (
                                    <div className="hidden md:flex items-center gap-3 min-w-0">
                                        <Avatar className="flex-shrink-0">
                                            <AvatarImage src={activeGroup.cover_photo_url} className="object-cover"/>
                                            <AvatarFallback>{activeGroup.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <h2 className="text-lg font-semibold truncate">{activeGroup.name}</h2>
                                            <p className="text-sm text-white/80 truncate">{activeGroup.description}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <h2 className="text-base font-semibold truncate leading-tight">{currentPageName}</h2>
                                )}
                            </div>
                            {/* Center: search — grows to fill available space */}
                            <div className="flex-1 flex justify-center px-1 sm:px-2 md:px-4 min-w-0">
                                <SmartSearch me={me} />
                            </div>
                            {/* Right: action buttons — fixed, never shrinks */}
                            <div className="flex items-center gap-0 sm:gap-0.5 flex-shrink-0">
                                {isUserAdminOfActiveGroup && currentPageName === 'Home' && (
                                    <Link to={`/GroupSettings?id=${activeGroup.id}`}>
                                        <Button variant="ghost" size="icon" className={`text-white ${activeTheme.buttonHover}`}>
                                            <Settings className="w-5 h-5"/>
                                        </Button>
                                    </Link>
                                )}
                                <Link to="/CreatePost">
                                    <Button variant="ghost" size="icon" className={`text-white ${activeTheme.buttonHover}`}>
                                        <PlusCircle className="w-5 h-5"/>
                                    </Button>
                                </Link>
                                <Notifications buttonHoverClass={activeTheme.buttonHover} />
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-9 w-9 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={me?.avatar_url} />
                                                <AvatarFallback>{me?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                                {me?.status === 'online' && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />}
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 bg-card border-border" align="end" forceMount>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{me?.full_name}</p>
                                                <p className="text-xs leading-none text-muted-foreground">{me?.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-border"/>
                                        {me?.role === 'admin' && (
                                            <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground">
                                                <Link to="/AdminDashboard"><LayoutDashboard className="mr-2 h-4 w-4" /><span>Admin Dashboard</span></Link>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground">
                                            <Link to="/Profile"><User className="mr-2 h-4 w-4" /><span>Profile</span></Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground">
                                            <Link to="/Settings"><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-border"/>
                                        <DropdownMenuItem onClick={() => { clearOneSignalUser(); base44.auth.logout(); }} className="focus:bg-destructive focus:text-destructive-foreground">
                                            <LogOut className="mr-2 h-4 w-4" /><span>Log out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <StoryReel />
                    </header>
                    <SheetContent side="left" className="p-0 w-80 border-r-0">
                        <SidebarContent />
                    </SheetContent>

                    {/* Page content with pull-to-refresh + slide transitions */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto relative"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Pull-to-refresh indicator */}
                        {(pullDistance > 0 || isRefreshing) && (
                            <div
                                className="flex items-center justify-center text-muted-foreground transition-all"
                                style={{ height: isRefreshing ? 48 : pullDistance * 0.6 }}
                            >
                                <Loader2
                                    className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                                    style={{ opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }}
                                />
                            </div>
                        )}
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={location.pathname}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.18, ease: 'easeInOut' }}
                                className="min-h-full"
                            >
                                <React.Suspense fallback={
                                    <div className="flex items-center justify-center h-64">
                                        <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                                    </div>
                                }>
                                    <Outlet context={{ activeGroup, groups, me }} />
                                </React.Suspense>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Mobile Bottom Tab Bar */}
                    <nav
                        className={`md:hidden flex-shrink-0 flex items-center justify-around border-t ${activeTheme.navbar} w-full`}
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)', minHeight: '56px' }}
                    >
                        {BOTTOM_TABS.map((tab) => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        if (tab.key === 'home') {
                                            navigate('/Posts');
                                        } else {
                                            handleTabPress(tab);
                                        }
                                    }}
                                    className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors active:scale-95 touch-manipulation ${
                                        isActive ? 'text-white' : 'text-white/50 hover:text-white/70'
                                    }`}
                                    style={{ minHeight: '56px' }}
                                >
                                    <TabIcon className={`w-5 h-5 mb-0.5 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-50'}`} />
                                    <span className="text-[9px] xs:text-[10px] leading-tight truncate max-w-full">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </main>
            </Sheet>
            {!termsAccepted && <TermsAcceptanceModal onAccept={acceptTerms} />}
            {incomingCall && (
              <IncomingCallModal
                caller={{ full_name: incomingCall.callerName, avatar_url: incomingCall.callerAvatar }}
                isVideoCall={incomingCall.callType === 'video'}
                isGroupCall={incomingCall.isGroupCall || false}
                groupName={incomingCall.groupName || ''}
                onAccept={handleAcceptCall}
                onDecline={handleDeclineCall}
              />
            )}
        </div>
    );
}