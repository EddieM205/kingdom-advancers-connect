import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wifi, WifiOff, CheckCircle2, Bell, MessageSquare, Users, Gamepad2, Calendar, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const themes = [
    { id: 'sunset_flare', name: 'Sunset Flare', sidebar: 'bg-gradient-to-br from-yellow-400 via-red-500 to-indigo-900', navbar: 'bg-gradient-to-r from-red-900 via-gray-800 to-black' },
    { id: 'oceanic_deep', name: 'Oceanic Deep', sidebar: 'bg-gradient-to-br from-green-300 via-blue-500 to-purple-600', navbar: 'bg-gray-900' },
    { id: 'royal_gold', name: 'Royal Gold', sidebar: 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-600', navbar: 'bg-gradient-to-r from-amber-400 to-yellow-600' },
    { id: 'forest_whisper', name: 'Forest Whisper', sidebar: 'bg-gradient-to-br from-gray-700 via-gray-900 to-black', navbar: 'bg-gradient-to-r from-green-500 to-green-700' },
    { id: 'candy_pop', name: 'Candy Pop', sidebar: 'bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500', navbar: 'bg-gradient-to-r from-rose-400 to-pink-600' },
    { id: 'monochrome', name: 'Monochrome', sidebar: 'bg-gray-800', navbar: 'bg-black' },
    { id: 'crimson_dawn', name: 'Crimson Dawn', sidebar: 'bg-gradient-to-br from-red-600 via-orange-500 to-red-700', navbar: 'bg-gray-900' },
    { id: 'azure_dream', name: 'Azure Dream', sidebar: 'bg-gradient-to-br from-sky-400 to-blue-600', navbar: 'bg-slate-800' },
    { id: 'emerald_isle', name: 'Emerald Isle', sidebar: 'bg-gradient-to-br from-emerald-500 to-teal-700', navbar: 'bg-gray-900' },
    { id: 'amethyst_haze', name: 'Amethyst Haze', sidebar: 'bg-gradient-to-br from-purple-500 to-fuchsia-600', navbar: 'bg-indigo-900' },
    { id: 'golden_hour', name: 'Golden Hour', sidebar: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600', navbar: 'bg-stone-800' },
    { id: 'cyberpunk_neon', name: 'Cyberpunk Neon', sidebar: 'bg-gradient-to-br from-pink-500 via-purple-600 to-cyan-500', navbar: 'bg-black' },
    { id: 'arctic_night', name: 'Arctic Night', sidebar: 'bg-gradient-to-br from-slate-800 via-blue-900 to-black', navbar: 'bg-slate-900' },
    { id: 'desert_mirage', name: 'Desert Mirage', sidebar: 'bg-gradient-to-br from-amber-600 via-yellow-700 to-orange-800', navbar: 'bg-blue-900' },
    { id: 'vintage_paper', name: 'Vintage Paper', sidebar: 'bg-gradient-to-br from-orange-100 to-amber-200', navbar: 'bg-stone-700' },
    { id: 'sakura_blossom', name: 'Sakura Blossom', sidebar: 'bg-gradient-to-br from-pink-200 to-rose-300', navbar: 'bg-rose-800' },
];

const ThemeCard = ({ theme, isSelected, onSelect }) => (
    <div onClick={() => onSelect(theme.id)} className={`cursor-pointer rounded-lg border-2 ${isSelected ? 'border-primary' : 'border-transparent'} overflow-hidden relative`}>
        <div className="w-full h-24">
            <div className={`h-8 w-full ${theme.navbar}`}></div>
            <div className={`h-16 w-full ${theme.sidebar}`}></div>
        </div>
        <div className="p-2 bg-card">
            <h4 className="text-sm font-semibold text-center">{theme.name}</h4>
        </div>
        {isSelected && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-white bg-primary rounded-full" />}
    </div>
);

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('online');

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    onSuccess: (data) => {
      if (data) {
        setStatus(data.status || 'online');
      }
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (updatedData) => base44.auth.updateMe(updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
  
  const handleStatusChange = (newStatus) => {
    const newStatusString = newStatus ? 'online' : 'offline';
    setStatus(newStatusString);
    updateSettingsMutation.mutate({ status: newStatusString });
  };
  
  const handleThemeChange = (themeId) => {
    updateSettingsMutation.mutate({ theme: themeId });
  };

  const notificationSettings = me?.notification_settings || {
    messages: true,
    friend_requests: true,
    game_challenges: true,
    events: true,
    mentions: true,
    email_notifications: false
  };

  const handleNotificationChange = (key, value) => {
    updateSettingsMutation.mutate({
      notification_settings: { ...notificationSettings, [key]: value }
    });
  };

  if (meLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-8 pb-24 sm:pb-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl">Settings</CardTitle>
          <CardDescription>Manage your account and application settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Activity Status</Label>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4 gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                    <Label className="text-sm sm:text-base">Show Online Status</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Let others know when you are active.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {status === 'online' ? <Wifi className="text-green-500" /> : <WifiOff className="text-gray-400" />}
                    <Switch
                        checked={status === 'online'}
                        onCheckedChange={handleStatusChange}
                        disabled={updateSettingsMutation.isLoading}
                    />
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Notifications</Label>
            <div className="p-3 sm:p-4 rounded-lg border space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <div>
                            <Label>Messages</Label>
                            <p className="text-sm text-muted-foreground">New message notifications</p>
                        </div>
                    </div>
                    <Switch checked={notificationSettings.messages} onCheckedChange={(v) => handleNotificationChange('messages', v)} />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-green-500" />
                        <div>
                            <Label>Friend Requests</Label>
                            <p className="text-sm text-muted-foreground">New friend request alerts</p>
                        </div>
                    </div>
                    <Switch checked={notificationSettings.friend_requests} onCheckedChange={(v) => handleNotificationChange('friend_requests', v)} />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Gamepad2 className="w-5 h-5 text-orange-500" />
                        <div>
                            <Label>Game Challenges</Label>
                            <p className="text-sm text-muted-foreground">When someone challenges you</p>
                        </div>
                    </div>
                    <Switch checked={notificationSettings.game_challenges} onCheckedChange={(v) => handleNotificationChange('game_challenges', v)} />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        <div>
                            <Label>Events</Label>
                            <p className="text-sm text-muted-foreground">Event invitations and reminders</p>
                        </div>
                    </div>
                    <Switch checked={notificationSettings.events} onCheckedChange={(v) => handleNotificationChange('events', v)} />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-amber-500" />
                        <div>
                            <Label>Mentions</Label>
                            <p className="text-sm text-muted-foreground">When someone mentions you</p>
                        </div>
                    </div>
                    <Switch checked={notificationSettings.mentions} onCheckedChange={(v) => handleNotificationChange('mentions', v)} />
                </div>
                <div className="border-t pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-gray-500" />
                        <div>
                            <Label>Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                    </div>
                    <Switch checked={notificationSettings.email_notifications} onCheckedChange={(v) => handleNotificationChange('email_notifications', v)} />
                </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold">Appearance</Label>
             <div className="p-4 rounded-lg border">
                <div className="space-y-0.5 mb-4">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                        Select a theme for your interface.
                    </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                    {themes.map(theme => (
                        <ThemeCard
                            key={theme.id}
                            theme={theme}
                            isSelected={me?.theme === theme.id}
                            onSelect={handleThemeChange}
                        />
                    ))}
                </div>
                {updateSettingsMutation.isLoading && <Loader2 className="mt-4 w-5 h-5 animate-spin" />}
            </div>
          </div>
          {/* Account Deletion */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-destructive">Danger Zone</Label>
            <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="shrink-0 ml-4">
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                       className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                       onClick={async () => {
                         if (me?.id) {
                           await base44.entities.User.delete(me.id).catch(() => {});
                         }
                         base44.auth.logout();
                       }}
                      >
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-muted-foreground space-y-1">
        <div className="flex items-center justify-center gap-3">
          <Link to="/PrivacyPolicy" className="hover:underline text-primary">Privacy Policy</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/CommunityGuidelines" className="hover:underline text-primary">Community Guidelines</Link>
        </div>
        <p className="text-xs">Kingdom Advancers Connect v3.0.0</p>
      </div>
    </div>
  );
}