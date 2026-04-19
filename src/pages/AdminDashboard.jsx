import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Newspaper, MessageSquare, History, ShieldAlert, Loader2, Crown, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const StatCard = ({ title, value, icon: Icon, description }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function AdminDashboardPage() {
    const { data: me, isLoading: meLoading } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

    const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['all_users'], queryFn: () => base44.entities.User.list() });
    const { data: posts, isLoading: postsLoading } = useQuery({ queryKey: ['all_posts'], queryFn: () => base44.entities.Post.list() });
    const { data: groups, isLoading: groupsLoading } = useQuery({ queryKey: ['all_groups'], queryFn: () => base44.entities.Group.list() });
    const { data: stories, isLoading: storiesLoading } = useQuery({ queryKey: ['all_stories'], queryFn: () => base44.entities.Story.list() });

    const analytics = useMemo(() => {
        if (!users || !posts || !groups || !stories) return null;

        const sevenDaysAgo = subDays(new Date(), 7);
        
        const newUsersLast7Days = users.filter(u => new Date(u.created_date) > sevenDaysAgo);
        const postsLast7Days = posts.filter(p => new Date(p.created_date) > sevenDaysAgo);
        
        const postsByDay = postsLast7Days.reduce((acc, post) => {
            const day = format(new Date(post.created_date), 'yyyy-MM-dd');
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});
        
        const usersByDay = newUsersLast7Days.reduce((acc, user) => {
            const day = format(new Date(user.created_date), 'yyyy-MM-dd');
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});

        const dateRange = Array.from({ length: 7 }).map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();

        const postActivityChartData = dateRange.map(day => ({
            date: format(new Date(day), 'MMM d'),
            Posts: postsByDay[day] || 0,
        }));
        
        const userGrowthChartData = dateRange.map(day => ({
            date: format(new Date(day), 'MMM d'),
            Users: usersByDay[day] || 0,
        }));
        
        const postsInGroups = posts.filter(p => p.group_id);
        const groupPostCounts = postsInGroups.reduce((acc, post) => {
            acc[post.group_id] = (acc[post.group_id] || 0) + 1;
            return acc;
        }, {});
        
        const groupMap = groups.reduce((acc, group) => {
            acc[group.id] = group.name;
            return acc;
        }, {});

        const mostActiveGroups = Object.entries(groupPostCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([groupId, count]) => ({
                name: groupMap[groupId] || 'Unknown Group',
                count
            }));

        const recentUsers = [...users].sort((a,b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

        return {
            totalUsers: users.length,
            totalPosts: posts.length,
            totalGroups: groups.length,
            totalStories: stories.length,
            postActivityChartData,
            userGrowthChartData,
            mostActiveGroups,
            recentUsers,
        };
    }, [users, posts, groups, stories]);

    const isLoading = meLoading || usersLoading || postsLoading || groupsLoading || storiesLoading;

    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (me?.role !== 'admin') {
        return (
            <div className="flex flex-col h-full w-full items-center justify-center text-center p-4">
                <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
            </div>
        );
    }
    
    if (!analytics) {
        return <div className="flex h-full w-full items-center justify-center">Preparing your dashboard...</div>;
    }

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="p-4 md:p-8 space-y-8 bg-gray-50/50">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Link to={createPageUrl("AdminManageData")}>
                    <Button variant="outline">
                        <Database className="mr-2 h-4 w-4" />
                        Manage Data
                    </Button>
                </Link>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Users" value={analytics.totalUsers} icon={Users} description="All registered users" />
                <StatCard title="Total Posts" value={analytics.totalPosts} icon={Newspaper} description="Across all groups and feeds" />
                <StatCard title="Total Groups" value={analytics.totalGroups} icon={MessageSquare} description="User-created communities" />
                <StatCard title="Total Stories" value={analytics.totalStories} icon={History} description="All stories created" />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Content Activity (Last 7 Days)</CardTitle>
                        <CardDescription>Number of posts created per day.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.postActivityChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Posts" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>New User Growth (Last 7 Days)</CardTitle>
                        <CardDescription>Number of new users joining per day.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.userGrowthChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Users" stroke="#82ca9d" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            
             <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Most Active Groups</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.mostActiveGroups.map(group => (
                                <div key={group.name} className="flex items-center">
                                    <Crown className="w-5 h-5 text-amber-500 mr-3"/>
                                    <div className="flex-1 font-medium">{group.name}</div>
                                    <div className="font-semibold">{group.count} posts</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Recently Joined Users</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.recentUsers.map(user => (
                                <div key={user.id} className="flex items-center">
                                    <Avatar className="h-9 w-9 mr-4">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium leading-none">{user.full_name}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                    <div className="ml-auto text-sm text-muted-foreground">{format(new Date(user.created_date), 'MMM d')}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
             </div>
             </div>
             </div>
             );
             }