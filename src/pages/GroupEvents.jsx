import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, MapPin, Users, Plus, Check, HelpCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const eventTypeColors = {
    meeting: 'bg-blue-100 text-blue-800',
    social: 'bg-green-100 text-green-800',
    study: 'bg-purple-100 text-purple-800',
    prayer: 'bg-amber-100 text-amber-800',
    other: 'bg-gray-100 text-gray-800'
};

const EventCard = ({ event, me, users, onRespond }) => {
    const isAttending = event.attendees?.includes(me?.email);
    const isMaybe = event.maybe_attendees?.includes(me?.email);
    const attendeeUsers = users?.filter(u => event.attendees?.includes(u.email)) || [];

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <span className={`text-xs px-2 py-1 rounded-full ${eventTypeColors[event.type]}`}>
                            {event.type}
                        </span>
                        <CardTitle className="mt-2">{event.title}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(event.start_date), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {format(parseISO(event.start_date), 'h:mm a')}
                    {event.end_date && ` - ${format(parseISO(event.end_date), 'h:mm a')}`}
                </div>
                {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                    </div>
                )}
                {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                )}
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div className="flex -space-x-2">
                        {attendeeUsers.slice(0, 5).map(u => (
                            <Avatar key={u.id} className="w-6 h-6 border-2 border-white">
                                <AvatarImage src={u.avatar_url} />
                                <AvatarFallback className="text-xs">{u.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {event.attendees?.length || 0} going
                        {event.maybe_attendees?.length > 0 && `, ${event.maybe_attendees.length} maybe`}
                    </span>
                </div>
            </CardContent>
            <CardFooter className="gap-2">
                <Button 
                    variant={isAttending ? "default" : "outline"} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onRespond(event, 'going')}
                >
                    <Check className="w-4 h-4 mr-1" /> Going
                </Button>
                <Button 
                    variant={isMaybe ? "secondary" : "outline"} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onRespond(event, 'maybe')}
                >
                    <HelpCircle className="w-4 h-4 mr-1" /> Maybe
                </Button>
            </CardFooter>
        </Card>
    );
};

export default function GroupEventsPage() {
    const location = useLocation();
    const queryClient = useQueryClient();
    const groupId = new URLSearchParams(location.search).get('groupId');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '', description: '', start_date: '', end_date: '', location: '', type: 'meeting'
    });

    const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
    const { data: group } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => base44.entities.Group.get(groupId),
        enabled: !!groupId
    });
    const { data: events, isLoading } = useQuery({
        queryKey: ['events', groupId],
        queryFn: () => base44.entities.Event.filter({ group_id: groupId }, 'start_date'),
        enabled: !!groupId,
        initialData: []
    });
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
        initialData: []
    });

    const createEventMutation = useMutation({
        mutationFn: (data) => base44.entities.Event.create({ ...data, group_id: groupId, attendees: [me.email] }),
        onSuccess: () => {
            queryClient.invalidateQueries(['events', groupId]);
            setIsDialogOpen(false);
            setNewEvent({ title: '', description: '', start_date: '', end_date: '', location: '', type: 'meeting' });
        }
    });

    const respondMutation = useMutation({
        mutationFn: ({ event, response }) => {
            let attendees = [...(event.attendees || [])].filter(e => e !== me.email);
            let maybe = [...(event.maybe_attendees || [])].filter(e => e !== me.email);
            if (response === 'going') attendees.push(me.email);
            else if (response === 'maybe') maybe.push(me.email);
            return base44.entities.Event.update(event.id, { attendees, maybe_attendees: maybe });
        },
        onSuccess: () => queryClient.invalidateQueries(['events', groupId])
    });

    const upcomingEvents = events.filter(e => new Date(e.start_date) >= new Date());

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="container mx-auto p-3 sm:p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Events</h1>
                    <p className="text-muted-foreground">{group?.name}</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Create Event</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Event</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Input placeholder="Event title" value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} />
                            <Textarea placeholder="Description" value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} />
                            <Select value={newEvent.type} onValueChange={(v) => setNewEvent({...newEvent, type: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="social">Social</SelectItem>
                                    <SelectItem value="study">Bible Study</SelectItem>
                                    <SelectItem value="prayer">Prayer</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Start</label>
                                    <Input type="datetime-local" value={newEvent.start_date} onChange={(e) => setNewEvent({...newEvent, start_date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">End</label>
                                    <Input type="datetime-local" value={newEvent.end_date} onChange={(e) => setNewEvent({...newEvent, end_date: e.target.value})} />
                                </div>
                            </div>
                            <Input placeholder="Location or link" value={newEvent.location} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={() => createEventMutation.mutate(newEvent)} disabled={!newEvent.title || !newEvent.start_date || createEventMutation.isLoading}>
                                {createEventMutation.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
            ) : upcomingEvents.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">No upcoming events</h3>
                        <p className="text-muted-foreground">Create an event to get started!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingEvents.map(event => (
                        <EventCard 
                            key={event.id} 
                            event={event} 
                            me={me} 
                            users={users}
                            onRespond={(e, r) => respondMutation.mutate({ event: e, response: r })}
                        />
                    ))}
                </div>
            )}
            </div>
        </div>
    );
}