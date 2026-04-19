import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Outlet } from "react-router-dom";
import { Hash, Users, Menu, Loader2, User, LogOut, Settings, Bell, Circle, PlusCircle, Home, BookOpen, Gamepad2, LayoutDashboard, Film, Video, MessageSquare } from "lucide-react";
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
import { formatDistanceToNow }
 from "date-fns";
import UserSearch from "./components/layout/UserSearch";
import StoryReel from "./components/stories/StoryReel";

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

// GroupList and Notifications components remain the same for now...
const GroupList = ({ groups, onGroupSelect, activeGroupId, unreadGroups }) => (
    <nav className="flex-1 px-2 space-y-1">
        {groups.map((group) => (
            <a
                key={group.id}
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    onGroupSelect(group);
                }}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                    activeGroupId === group.id
                        ? "bg-black/20 text-white"
                        : "text-white/80 hover:bg-black/10"
                }`}
            >
                <Avatar className="w-8 h-8 mr-3">
                    <AvatarImage src={group.cover_photo_url} className="object-cover" />
                    <AvatarFallback className="bg-black/20 text-white font-bold">
                        {group.type === 'dm' ? <User className="w-4 h-4"/> : <Hash className="w-4 h-4" />}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <span className="block">{group.name.startsWith('DM with') ? group.name.substring(8) : group.name}</span>
                  {group.type === 'group' && <span className="block text-xs opacity-70 truncate">{group.description}</span>}
                </div>
                {unreadGroups.includes(group.id) && <Circle className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 fill-white text-white" />}
            </a>
        ))}
    </nav>
);

const Notifications = ({ buttonHoverClass }) => {
  const queryClient = useQueryClient();
  const {data: me} = useQuery({queryKey: ['me'], queryFn: () => base44.auth.me()});
  const {data: notifications, isLoading} = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({recipient_id: me.email, is_read: false}, '-created_date', 10),
    enabled: !!me,
    refetchInterval: 15000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notifId) => base44.entities.Notification.update(notifId, {is_read: true}),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative text-white ${buttonHoverClass}`}>
          <Bell className="w-5 h-5"/>
          {notifications && notifications.length > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400 ring-2 ring-white"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-border">
        <div className="p-4 font-semibold border-b border-border">Notifications</div>
        <div className="space-y-1 p-2 max-h-96 overflow-y-auto">
          {isLoading && <Loader2 className="mx-auto my-4 w-6 h-6 animate-spin" />}
          {!isLoading && notifications?.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No new notifications</p>}
          {notifications?.map(notif => (
            <Link key={notif.id} to={notif.link || '#'} onClick={() => markAsReadMutation.mutate(notif.id)}>
              <div className="p-2 rounded-md hover:bg-accent">
                <p className="text-sm">{notif.content}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}</p>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};


export default function Layout({ currentPageName }) {
    const queryClient = useQueryClient();
    const [activeGroup, setActiveGroup] = useState(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [unreadGroups, setUnreadGroups] = useState([]);

    const { data: me } = useQuery({
      queryKey: ['me'],
      queryFn: () => base44.auth.me()
    });

    const activeTheme = themes[me?.theme] || themes.sunset_flare;

    const isUserAdminOfActiveGroup = useMemo(() => {
        if (!me || !activeGroup || activeGroup.type === 'dm') return false;
        return activeGroup.admins?.includes(me.email);
    }, [me, activeGroup]);
    
    useEffect(() => {
        document.documentElement.classList.remove('dark');
    }, []);

    const { data: groups = [], isLoading: groupsLoading } = useQuery({
        queryKey: ["groups"],
        queryFn: () => base44.entities.Group.list(),
    });

    useEffect(() => {
        if (!activeGroup && groups.length > 0 && (currentPageName === 'Posts' || !currentPageName)) {
            setActiveGroup(groups[0]);
        }
    }, [groups, activeGroup, currentPageName]);
    
    const handleGroupSelect = (group) => {
      setActiveGroup(group);
      setIsSheetOpen(false);
    }

    const SidebarContent = () => (
      <div className={`flex flex-col h-full text-white border-r ${activeTheme.sidebar}`}>
          <Link to={createPageUrl("Posts")} className="p-4 border-b border-white/20 hover:bg-black/10 transition-colors">
              <h1 className="text-xl font-bold text-white">Kingdom Advancers</h1>
          </Link>
          <nav className="flex flex-col p-2 space-y-1">
              <Link to={createPageUrl("Posts")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <Home className="w-5 h-5 mr-3"/> Posts
              </Link>
               <Link to={createPageUrl("Feed")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <Film className="w-5 h-5 mr-3"/> Stories
              </Link>
               <Link to={createPageUrl("Contacts")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <Users className="w-5 h-5 mr-3"/> Contacts
               </Link>
              <Link to={createPageUrl("Bible")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <BookOpen className="w-5 h-5 mr-3"/> Bible
              </Link>
              <Link to={createPageUrl("Games")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <Gamepad2 className="w-5 h-5 mr-3"/> Games
              </Link>
              <Link to={createPageUrl("VideoCalls")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <Video className="w-5 h-5 mr-3"/> Video Calls
              </Link>
              <Link to={createPageUrl("Chat")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <MessageSquare className="w-5 h-5 mr-3"/> Chat
              </Link>
              <Link to={createPageUrl("Activity")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <Bell className="w-5 h-5 mr-3"/> Activity
              </Link>
              <Link to={createPageUrl("Reels")} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-white/80 hover:bg-black/10`}>
                  <Film className="w-5 h-5 mr-3"/> Reels
              </Link>
              </nav>
          <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                 <h2 className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center"><Hash className="w-4 h-4 mr-2"/>Conversations</h2>
                 <Link to={createPageUrl("CreateGroup")}>
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
      </div>
    );

    return (
        <div className="h-screen w-full flex bg-gray-50 text-foreground overflow-hidden">
            <aside className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0">
                <SidebarContent />
            </aside>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <main className="flex-1 md:pl-80 flex flex-col">
                    <header className={`flex-shrink-0 text-white border-b ${activeTheme.navbar} flex flex-col`}>
                        <div className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center gap-4">
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className={`md:hidden text-white ${activeTheme.buttonHover}`}>
                                        <Menu className="h-6 w-6" />
                                    </Button>
                                </SheetTrigger>
                                {activeGroup && currentPageName === 'Posts' ? ( // Changed to Posts
                                  <div className="hidden md:flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={activeGroup.cover_photo_url} className="object-cover"/>
                                        <AvatarFallback>{activeGroup.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-lg font-semibold">{activeGroup.name}</h2>
                                        <p className="text-sm text-white/80">{activeGroup.description}</p>
                                    </div>
                                  </div>
                                ) : (
                                    <h2 className="text-lg font-semibold truncate">{currentPageName === "Friends" ? "Friends" : currentPageName === "Feed" ? "Stories" : currentPageName}</h2>
                                )}
                            </div>
                            <div className="flex-1 flex justify-center px-2 md:px-8">
                                <UserSearch me={me} />
                            </div>
                            <div className="flex items-center space-x-1">
                               {isUserAdminOfActiveGroup && currentPageName === 'Posts' && ( // Changed to Posts
                                    <Link to={createPageUrl(`GroupSettings?id=${activeGroup.id}`)}>
                                        <Button variant="ghost" size="icon" className={`text-white ${activeTheme.buttonHover}`}>
                                            <Settings className="w-5 h-5"/>
                                        </Button>
                                   </Link>
                               )}
                               <Link to={createPageUrl("CreatePost")}>
                                    <Button variant="ghost" size="icon" className={`text-white ${activeTheme.buttonHover}`}>
                                        <PlusCircle className="w-5 h-5"/>
                                    </Button>
                               </Link>
                               <Notifications buttonHoverClass={activeTheme.buttonHover} />
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="relative h-8 w-8 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                                            onClick={(e) => e.preventDefault()}
                                        >
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
                                                <Link to={createPageUrl("AdminDashboard")}><LayoutDashboard className="mr-2 h-4 w-4" /><span>Admin Dashboard</span></Link>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground">
                                          <Link to={createPageUrl("Profile")}><User className="mr-2 h-4 w-4" /><span>Profile</span></Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground">
                                          <Link to={createPageUrl("Settings")}><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-border"/>
                                        <DropdownMenuItem onClick={() => base44.auth.logout()} className="focus:bg-destructive focus:text-destructive-foreground">
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
                    <div className="flex-1 overflow-y-auto">
                      <Outlet context={{ activeGroup, groups, me }} />
                    </div>
                </main>
            </Sheet>
        </div>
    );
}