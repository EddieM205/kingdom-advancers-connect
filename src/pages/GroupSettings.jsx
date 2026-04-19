import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Crown, Camera, Search, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
} from "@/components/ui/alert-dialog"

export default function GroupSettingsPage({ me }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const groupId = new URLSearchParams(location.search).get('id');

    const [groupData, setGroupData] = useState(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    const { data: group, isLoading: groupLoading, isError } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => base44.entities.Group.get(groupId),
        enabled: !!groupId,
        onSuccess: (data) => setGroupData(data)
    });

    const { data: members, isLoading: membersLoading } = useQuery({
        queryKey: ['groupMembers', groupId],
        queryFn: () => base44.entities.User.filter({ email: { '$in': group.members } }),
        enabled: !!group?.members?.length,
        initialData: []
    });
    
    const memberMap = useMemo(() => members.reduce((acc, user) => {
        acc[user.email] = user;
        return acc;
    }, {}), [members]);

    const isUserAdmin = useMemo(() => group?.admins?.includes(me?.email), [group, me]);

    const updateMutation = useMutation({
        mutationFn: (updatedGroup) => base44.entities.Group.update(groupId, updatedGroup),
        onSuccess: () => {
            queryClient.invalidateQueries(['group', groupId]);
            queryClient.invalidateQueries(['groups']);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Group.delete(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries(['groups']);
            navigate('/');
        }
    });
    
     const handleCoverPhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            updateMutation.mutate({ cover_photo_url: file_url });
        } catch (error) {
            console.error("Failed to upload cover photo:", error);
            alert("Failed to upload cover photo.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveDetails = () => {
        updateMutation.mutate({ name: groupData.name, description: groupData.description });
    };

    const notifyMutation = useMutation({
        mutationFn: (data) => base44.entities.Notification.create(data),
    });

    const handleInvite = () => {
        if (!inviteEmail.trim() || group.members.includes(inviteEmail.trim())) return;
        const updatedMembers = [...group.members, inviteEmail.trim()];
        updateMutation.mutate({ members: updatedMembers });
        // Send notification to invited user
        notifyMutation.mutate({
            recipient_id: inviteEmail.trim(),
            content: `You've been added to the group "${group.name}"`,
            link: '/',
        });
        setInviteEmail('');
    };

    const handleRemoveMember = (email) => {
        const updatedMembers = group.members.filter(m => m !== email);
        const updatedAdmins = group.admins.filter(a => a !== email);
        updateMutation.mutate({ members: updatedMembers, admins: updatedAdmins });
        // Notify removed user
        notifyMutation.mutate({
            recipient_id: email,
            content: `You've been removed from the group "${group.name}"`,
            link: '/',
        });
    };
    
    const handleToggleAdmin = (email) => {
        const isCurrentlyAdmin = group.admins.includes(email);
        const updatedAdmins = isCurrentlyAdmin
            ? group.admins.filter(a => a !== email)
            : [...group.admins, email];
        updateMutation.mutate({ admins: updatedAdmins });
        // Notify user about admin status change
        notifyMutation.mutate({
            recipient_id: email,
            content: isCurrentlyAdmin 
                ? `You are no longer an admin in "${group.name}"`
                : `You are now an admin in "${group.name}"`,
            link: '/',
        });
    };

    if (groupLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (isError || !group) return <div className="p-8 text-center text-red-500">Group not found or an error occurred.</div>;
    if (!isUserAdmin) return <div className="p-8 text-center text-red-500">You do not have permission to manage this group.</div>;

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="container mx-auto p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8">
            <Card>
                 <CardHeader>
                    <div className="relative h-48 rounded-t-lg bg-secondary">
                        <img src={group.cover_photo_url} alt="Group Cover" className="w-full h-full object-cover rounded-t-lg"/>
                        <label htmlFor="cover-photo-upload" className="absolute bottom-2 right-2 bg-black/50 text-white rounded-full p-2 cursor-pointer hover:bg-black/75">
                           {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                        </label>
                        <input id="cover-photo-upload" type="file" className="hidden" accept="image/*" onChange={handleCoverPhotoChange} disabled={isUploading} />
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                     <CardTitle>Group Details</CardTitle>
                     <CardDescription>Update your group's name and description.</CardDescription>
                    <Input value={groupData?.name || ''} onChange={e => setGroupData({...groupData, name: e.target.value})} />
                    <Textarea value={groupData?.description || ''} onChange={e => setGroupData({...groupData, description: e.target.value})} />
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveDetails} disabled={updateMutation.isLoading}>
                        {updateMutation.isLoading && !isUploading && <Loader2 className="mr-2 w-4 h-4 animate-spin"/>} Save Changes
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Members</CardTitle>
                    <CardDescription>Invite new members and manage existing ones.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2">
                        <Input placeholder="Invite user by email..." value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                        <Button onClick={handleInvite} disabled={updateMutation.isLoading}>Invite</Button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Members ({members.length})</h4>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search members..." 
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        {membersLoading && <Loader2 className="w-6 h-6 animate-spin"/>}
                        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                           {group.members.filter(email => {
                               const member = memberMap[email];
                               if (!memberSearch) return true;
                               return member?.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) || 
                                      email.toLowerCase().includes(memberSearch.toLowerCase());
                           }).map(email => {
                                const member = memberMap[email];
                                if (!member) return null;
                                const isMemberAdmin = group.admins.includes(email);
                                return (
                                    <div key={email} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={member.avatar_url} />
                                                <AvatarFallback>{member.full_name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold flex items-center gap-2">
                                                    {member.full_name}
                                                    {isMemberAdmin && <Crown className="w-4 h-4 text-amber-500" />}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{email}</p>
                                            </div>
                                        </div>
                                        {me.email !== email && (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant={isMemberAdmin ? "secondary" : "outline"} onClick={() => handleToggleAdmin(email)} disabled={updateMutation.isLoading}>
                                                    {isMemberAdmin ? 'Remove Admin' : 'Make Admin'}
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(email)} disabled={updateMutation.isLoading}>Remove</Button>
                                            </div>
                                        )}
                                    </div>
                                );
                           })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Group Events
                    </CardTitle>
                    <CardDescription>Plan and manage events for this group.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link to={createPageUrl(`GroupEvents?groupId=${groupId}`)}>
                        <Button>Manage Events</Button>
                    </Link>
                </CardFooter>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Delete Group</CardTitle>
                    <CardDescription>Permanently delete this group and all of its content. This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardFooter>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Delete Group</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the group "{group.name}". This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isLoading}>
                                     {deleteMutation.isLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin"/>} Continue
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
            </div>
        </div>
    );
}