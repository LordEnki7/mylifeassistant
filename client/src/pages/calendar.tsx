import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string; // meeting, deadline, gig, etc.
  description: string;
  location?: string;
  reminder?: string;
}

export default function Calendar() {
  const [isAdding, setIsAdding] = useState(false);
  const [currentView, setCurrentView] = useState<"month" | "week" | "list">("list");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock events - in production this would come from API
  const events: CalendarEvent[] = [
    {
      id: "1",
      title: "Grant Application Deadline - Arts Council",
      date: "2024-03-15",
      time: "23:59",
      type: "deadline",
      description: "Final deadline for Community Arts Development Grant application",
      reminder: "1 day before"
    },
    {
      id: "2",
      title: "Radio Interview - KQED",
      date: "2024-03-18",
      time: "14:00",
      type: "interview",
      description: "Live interview about C.A.R.E.N. project and upcoming album",
      location: "KQED Studios, San Francisco",
      reminder: "2 hours before"
    },
    {
      id: "3",
      title: "Music Licensing Meeting",
      date: "2024-03-20",
      time: "10:30",
      type: "meeting",
      description: "Discuss sync licensing opportunities for indie film project",
      location: "Zoom Meeting",
      reminder: "15 minutes before"
    },
    {
      id: "4",
      title: "Invoice Payment Due - Client ABC",
      date: "2024-03-22",
      time: "17:00",
      type: "payment",
      description: "Follow up on overdue invoice #2024-001",
      reminder: "1 day before"
    }
  ];

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    type: "meeting",
    description: "",
    location: "",
    reminder: "15 minutes before",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would call the API to create a new event
    console.log("Creating calendar event:", formData);
    setIsAdding(false);
    setFormData({
      title: "",
      date: "",
      time: "",
      type: "meeting",
      description: "",
      location: "",
      reminder: "15 minutes before",
    });
  };

  const typeColors = {
    meeting: "bg-blue-100 text-blue-800",
    deadline: "bg-red-100 text-red-800",
    gig: "bg-purple-100 text-purple-800",
    interview: "bg-green-100 text-green-800",
    payment: "bg-yellow-100 text-yellow-800",
    other: "bg-gray-100 text-gray-800",
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    return events
      .filter(event => new Date(event.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  };

  const getEventsByDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const formatEventTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    const eventDate = new Date(dateString);
    return eventDate.toDateString() === today.toDateString();
  };

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = new Date(dateString);
    return eventDate.toDateString() === tomorrow.toDateString();
  };

  const getRelativeDateText = (dateString: string) => {
    if (isToday(dateString)) return "Today";
    if (isTomorrow(dateString)) return "Tomorrow";
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Calendar</h1>
          <p className="text-gray-600">Manage your schedule, deadlines, and important dates.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setIsAdding(true)} className="flex items-center">
            <Icons.plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
          <Button variant="outline" className="flex items-center">
            <Icons.calendar className="h-4 w-4 mr-2" />
            Export iCal
          </Button>
        </div>
      </div>

      {/* Calendar View Toggle */}
      <Card className="material-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={currentView === "list" ? "default" : "outline"}
                onClick={() => setCurrentView("list")}
              >
                List View
              </Button>
              <Button
                size="sm"
                variant={currentView === "month" ? "default" : "outline"}
                onClick={() => setCurrentView("month")}
                disabled
              >
                Month View
              </Button>
              <Button
                size="sm"
                variant={currentView === "week" ? "default" : "outline"}
                onClick={() => setCurrentView("week")}
                disabled
              >
                Week View
              </Button>
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {isAdding && (
        <Card className="material-card mb-8">
          <CardHeader>
            <CardTitle>Add Calendar Event</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Grant Application Deadline"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="gig">Performance/Gig</option>
                    <option value="interview">Interview</option>
                    <option value="payment">Payment Due</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reminder
                  </label>
                  <select
                    value={formData.reminder}
                    onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="none">No reminder</option>
                    <option value="15 minutes before">15 minutes before</option>
                    <option value="1 hour before">1 hour before</option>
                    <option value="2 hours before">2 hours before</option>
                    <option value="1 day before">1 day before</option>
                    <option value="1 week before">1 week before</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <Input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Zoom Meeting, Studio A, etc."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event details, notes, etc."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Add Event
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Events Display */}
      <div className="space-y-6">
        {currentView === "list" && (
          <Card className="material-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.calendar className="mr-2 h-5 w-5 text-primary-500" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getUpcomingEvents().length === 0 ? (
                  <div className="text-center py-8">
                    <Icons.calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
                    <p className="text-gray-600 mb-4">
                      Add events to keep track of your schedule and important deadlines.
                    </p>
                    <Button onClick={() => setIsAdding(true)}>
                      <Icons.plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                ) : (
                  getUpcomingEvents().map((event) => (
                    <div key={event.id} className="border-l-4 border-primary-500 pl-4 py-3 hover:bg-gray-50 rounded-r-lg transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <Badge className={typeColors[event.type as keyof typeof typeColors]}>
                                {event.type}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-semibold text-gray-900 truncate">
                                {event.title}
                              </h4>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Icons.calendar className="h-4 w-4 mr-1" />
                                  {getRelativeDateText(event.date)}
                                </span>
                                {event.time && (
                                  <span className="flex items-center">
                                    <Icons.clock className="h-4 w-4 mr-1" />
                                    {formatEventTime(event.time)}
                                  </span>
                                )}
                                {event.location && (
                                  <span className="flex items-center truncate">
                                    <Icons.building className="h-4 w-4 mr-1 flex-shrink-0" />
                                    <span className="truncate">{event.location}</span>
                                  </span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                              {event.reminder && event.reminder !== "none" && (
                                <div className="flex items-center mt-2 text-xs text-gray-500">
                                  <Icons.bell className="h-3 w-3 mr-1" />
                                  Reminder: {event.reminder}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-auto">
                          <Button size="sm" variant="outline">
                            <Icons.email className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            <Icons.more className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected Date Events */}
        {selectedDate && (
          <Card className="material-card">
            <CardHeader>
              <CardTitle>
                Events for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getEventsByDate(selectedDate).length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No events scheduled for this date.</p>
                ) : (
                  getEventsByDate(selectedDate).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={typeColors[event.type as keyof typeof typeColors]}>
                          {event.type}
                        </Badge>
                        <div>
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          {event.time && (
                            <p className="text-sm text-gray-600">{formatEventTime(event.time)}</p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
