import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserDataTab from '../components/admin/UserDataTab';
import PostDataTab from '../components/admin/PostDataTab';
import StoryDataTab from '../components/admin/StoryDataTab';

export default function AdminManageDataPage() {
    const { data: me, isLoading: meLoading } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

    if (meLoading) {
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

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-6">Manage App Data</h1>
            <Tabs defaultValue="users">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="posts">Posts</TabsTrigger>
                    <TabsTrigger value="stories">Stories</TabsTrigger>
                </TabsList>
                <TabsContent value="users">
                    <UserDataTab />
                </TabsContent>
                <TabsContent value="posts">
                    <PostDataTab />
                </TabsContent>
                <TabsContent value="stories">
                    <StoryDataTab />
                </TabsContent>
            </Tabs>
            </div>
        </div>
    );
}