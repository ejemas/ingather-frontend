export const DEFAULT_EVENT_TEMPLATE = 'general';
export const EVENT_TEMPLATE_STORAGE_KEY = 'ingather-event-template';

export const eventTemplates = {
  general: {
    id: 'general',
    name: 'General Event',
    organization: {
      singular: 'Organization',
      workspaceLabel: 'Workspace',
      nameLabel: 'Organization name',
      branchLabel: 'Team, branch, or location'
    },
    event: {
      singular: 'Event',
      plural: 'Events',
      session: 'Session',
      create: 'Create Event',
      createNew: 'Create New Event',
      all: 'All Events',
      recent: 'Recent Events',
      total: 'Total Events',
      upcoming: 'Upcoming Events',
      titleLabel: 'Event Title',
      titlePlaceholder: 'e.g., Product Demo Night, Leadership Summit'
    },
    attendee: {
      singular: 'Attendee',
      plural: 'Attendees',
      guest: 'Guest'
    },
    host: {
      singular: 'Host',
      admin: 'Administrator'
    },
    dashboard: {
      emptyState: 'No events found for this filter.',
      deleteConfirm: 'Are you sure you want to delete "{title}"? This will permanently remove all its data.',
      deleteSuccess: 'Event deleted successfully!',
      deleteFailure: 'Failed to delete event.',
      totalTitle: 'Total Events',
      upcomingTitle: 'Upcoming Events'
    },
    scan: {
      success: 'You have been checked in successfully. Enjoy the event!',
      giftHelper: 'Fill this form for a chance to win a special gift from the organizer.',
      noWin: 'You did not win this time, but we are glad you are here. Enjoy the rest of the event.',
      closedTitle: 'Event Already Closed',
      closedBody: 'This event may have ended or may no longer be active.',
      alreadyScanned: 'You have already scanned the QR code. Each device can only scan once for this event.'
    },
    landing: {
      segmentLabel: 'Built for every gathering'
    }
  },
  techMeetup: {
    id: 'techMeetup',
    name: 'Tech Meetup',
    organization: {
      singular: 'Community',
      workspaceLabel: 'Community Workspace',
      nameLabel: 'Community or organizer name',
      branchLabel: 'City, chapter, or venue'
    },
    event: {
      singular: 'Meetup',
      plural: 'Meetups',
      session: 'Session',
      create: 'Create Meetup',
      createNew: 'Create New Meetup',
      all: 'All Meetups',
      recent: 'Recent Meetups',
      total: 'Total Meetups',
      upcoming: 'Upcoming Meetups',
      titleLabel: 'Meetup Title',
      titlePlaceholder: 'e.g., Lagos AI Builders Night, Frontend Jam'
    },
    attendee: {
      singular: 'Participant',
      plural: 'Participants',
      guest: 'Guest'
    },
    host: {
      singular: 'Host',
      admin: 'Organizer'
    },
    dashboard: {
      emptyState: 'No meetups found for this filter.',
      deleteConfirm: 'Are you sure you want to delete "{title}"? This will permanently remove all meetup data.',
      deleteSuccess: 'Meetup deleted successfully!',
      deleteFailure: 'Failed to delete meetup.',
      totalTitle: 'Total Meetups',
      upcomingTitle: 'Upcoming Meetups'
    },
    scan: {
      success: 'You have been checked in successfully. Enjoy the meetup!',
      giftHelper: 'Fill this form for a chance to win a special gift from the organizer.',
      noWin: 'You did not win this time, but we are glad you joined the meetup.',
      closedTitle: 'Meetup Already Closed',
      closedBody: 'This meetup may have ended or may no longer be active.',
      alreadyScanned: 'You have already scanned the QR code. Each device can only scan once for this meetup.'
    },
    landing: {
      segmentLabel: 'Built for builder communities'
    }
  },
  conference: {
    id: 'conference',
    name: 'Conference',
    organization: {
      singular: 'Event Organizer',
      workspaceLabel: 'Conference Workspace',
      nameLabel: 'Organizer or company name',
      branchLabel: 'Track, city, or venue'
    },
    event: {
      singular: 'Conference',
      plural: 'Conferences',
      session: 'Session',
      create: 'Create Conference',
      createNew: 'Create New Conference',
      all: 'All Conferences',
      recent: 'Recent Conferences',
      total: 'Total Conferences',
      upcoming: 'Upcoming Conferences',
      titleLabel: 'Conference Title',
      titlePlaceholder: 'e.g., Product Leadership Conf, Lagos Growth Summit'
    },
    attendee: {
      singular: 'Participant',
      plural: 'Participants',
      guest: 'Guest'
    },
    host: {
      singular: 'Host',
      admin: 'Administrator'
    },
    dashboard: {
      emptyState: 'No conferences found for this filter.',
      deleteConfirm: 'Are you sure you want to delete "{title}"? This will permanently remove all conference data.',
      deleteSuccess: 'Conference deleted successfully!',
      deleteFailure: 'Failed to delete conference.',
      totalTitle: 'Total Conferences',
      upcomingTitle: 'Upcoming Conferences'
    },
    scan: {
      success: 'You have been checked in successfully. Enjoy the conference!',
      giftHelper: 'Fill this form for a chance to receive a special gift from the organizer.',
      noWin: 'You did not receive a gift this time, but we are glad you joined the conference.',
      closedTitle: 'Conference Already Closed',
      closedBody: 'This conference may have ended or may no longer be active.',
      alreadyScanned: 'You have already scanned the QR code. Each device can only scan once for this conference.'
    },
    landing: {
      segmentLabel: 'Built for high-signal conferences'
    }
  },
  seminar: {
    id: 'seminar',
    name: 'Seminar',
    organization: {
      singular: 'Event Organizer',
      workspaceLabel: 'Seminar Workspace',
      nameLabel: 'Organizer or institution name',
      branchLabel: 'Department, city, or venue'
    },
    event: {
      singular: 'Seminar',
      plural: 'Seminars',
      session: 'Session',
      create: 'Create Seminar',
      createNew: 'Create New Seminar',
      all: 'All Seminars',
      recent: 'Recent Seminars',
      total: 'Total Seminars',
      upcoming: 'Upcoming Seminars',
      titleLabel: 'Seminar Title',
      titlePlaceholder: 'e.g., Founder Finance Seminar, Research Methods Lab'
    },
    attendee: {
      singular: 'Participant',
      plural: 'Participants',
      guest: 'Guest'
    },
    host: {
      singular: 'Facilitator',
      admin: 'Administrator'
    },
    dashboard: {
      emptyState: 'No seminars found for this filter.',
      deleteConfirm: 'Are you sure you want to delete "{title}"? This will permanently remove all seminar data.',
      deleteSuccess: 'Seminar deleted successfully!',
      deleteFailure: 'Failed to delete seminar.',
      totalTitle: 'Total Seminars',
      upcomingTitle: 'Upcoming Seminars'
    },
    scan: {
      success: 'You have been checked in successfully. Enjoy the seminar!',
      giftHelper: 'Fill this form for a chance to receive a special gift from the organizer.',
      noWin: 'You did not receive a gift this time, but we are glad you joined the seminar.',
      closedTitle: 'Seminar Already Closed',
      closedBody: 'This seminar may have ended or may no longer be active.',
      alreadyScanned: 'You have already scanned the QR code. Each device can only scan once for this seminar.'
    },
    landing: {
      segmentLabel: 'Built for learning sessions'
    }
  },
  bootcamp: {
    id: 'bootcamp',
    name: 'Bootcamp',
    organization: {
      singular: 'Training Team',
      workspaceLabel: 'Bootcamp Workspace',
      nameLabel: 'Training organization name',
      branchLabel: 'Cohort, campus, or location'
    },
    event: {
      singular: 'Bootcamp',
      plural: 'Bootcamps',
      session: 'Class',
      create: 'Create Bootcamp',
      createNew: 'Create New Bootcamp',
      all: 'All Bootcamps',
      recent: 'Recent Bootcamps',
      total: 'Total Bootcamps',
      upcoming: 'Upcoming Bootcamps',
      titleLabel: 'Bootcamp Title',
      titlePlaceholder: 'e.g., Data Analytics Bootcamp, Startup Sales Cohort'
    },
    attendee: {
      singular: 'Learner',
      plural: 'Learners',
      guest: 'Guest'
    },
    host: {
      singular: 'Instructor',
      admin: 'Administrator'
    },
    dashboard: {
      emptyState: 'No bootcamps found for this filter.',
      deleteConfirm: 'Are you sure you want to delete "{title}"? This will permanently remove all bootcamp data.',
      deleteSuccess: 'Bootcamp deleted successfully!',
      deleteFailure: 'Failed to delete bootcamp.',
      totalTitle: 'Total Bootcamps',
      upcomingTitle: 'Upcoming Bootcamps'
    },
    scan: {
      success: 'You have been checked in successfully. Enjoy the bootcamp!',
      giftHelper: 'Fill this form for a chance to receive a special gift from the organizer.',
      noWin: 'You did not receive a gift this time, but we are glad you joined the bootcamp.',
      closedTitle: 'Bootcamp Already Closed',
      closedBody: 'This bootcamp may have ended or may no longer be active.',
      alreadyScanned: 'You have already scanned the QR code. Each device can only scan once for this bootcamp.'
    },
    landing: {
      segmentLabel: 'Built for training cohorts'
    }
  },
  corporateEvent: {
    id: 'corporateEvent',
    name: 'Corporate Event',
    organization: {
      singular: 'Company',
      workspaceLabel: 'Company Workspace',
      nameLabel: 'Company or organizer name',
      branchLabel: 'Department, branch, or location'
    },
    event: {
      singular: 'Session',
      plural: 'Sessions',
      session: 'Session',
      create: 'Create Session',
      createNew: 'Create New Session',
      all: 'All Sessions',
      recent: 'Recent Sessions',
      total: 'Total Sessions',
      upcoming: 'Upcoming Sessions',
      titleLabel: 'Session Title',
      titlePlaceholder: 'e.g., Quarterly Town Hall, Leadership Offsite'
    },
    attendee: {
      singular: 'Participant',
      plural: 'Participants',
      guest: 'Guest'
    },
    host: {
      singular: 'Host',
      admin: 'Administrator'
    },
    dashboard: {
      emptyState: 'No sessions found for this filter.',
      deleteConfirm: 'Are you sure you want to delete "{title}"? This will permanently remove all session data.',
      deleteSuccess: 'Session deleted successfully!',
      deleteFailure: 'Failed to delete session.',
      totalTitle: 'Total Sessions',
      upcomingTitle: 'Upcoming Sessions'
    },
    scan: {
      success: 'You have been checked in successfully. Enjoy the session!',
      giftHelper: 'Fill this form for a chance to receive a special organizer gift.',
      noWin: 'You did not receive a gift this time, but we are glad you are here.',
      closedTitle: 'Session Already Closed',
      closedBody: 'This session may have ended or may no longer be active.',
      alreadyScanned: 'You have already scanned the QR code. Each device can only scan once for this session.'
    },
    landing: {
      segmentLabel: 'Built for business gatherings'
    }
  },
  communityGathering: {
    id: 'communityGathering',
    name: 'Community Gathering',
    organization: {
      singular: 'Community',
      workspaceLabel: 'Community Workspace',
      nameLabel: 'Community or organizer name',
      branchLabel: 'Chapter, city, or venue'
    },
    event: {
      singular: 'Gathering',
      plural: 'Gatherings',
      session: 'Session',
      create: 'Create Gathering',
      createNew: 'Create New Gathering',
      all: 'All Gatherings',
      recent: 'Recent Gatherings',
      total: 'Total Gatherings',
      upcoming: 'Upcoming Gatherings',
      titleLabel: 'Gathering Title',
      titlePlaceholder: 'e.g., Creators Mixer, Neighborhood Forum'
    },
    attendee: {
      singular: 'Participant',
      plural: 'Participants',
      guest: 'Guest'
    },
    host: {
      singular: 'Host',
      admin: 'Administrator'
    },
    dashboard: {
      emptyState: 'No gatherings found for this filter.',
      deleteConfirm: 'Are you sure you want to delete "{title}"? This will permanently remove all gathering data.',
      deleteSuccess: 'Gathering deleted successfully!',
      deleteFailure: 'Failed to delete gathering.',
      totalTitle: 'Total Gatherings',
      upcomingTitle: 'Upcoming Gatherings'
    },
    scan: {
      success: 'You have been checked in successfully. Enjoy the gathering!',
      giftHelper: 'Fill this form for a chance to receive a special gift from the organizer.',
      noWin: 'You did not receive a gift this time, but we are glad you joined the gathering.',
      closedTitle: 'Gathering Already Closed',
      closedBody: 'This gathering may have ended or may no longer be active.',
      alreadyScanned: 'You have already scanned the QR code. Each device can only scan once for this gathering.'
    },
    landing: {
      segmentLabel: 'Built for community moments'
    }
  },
  church: {
    id: 'church',
    name: 'Church',
    organization: {
      singular: 'Church',
      workspaceLabel: 'Church Workspace',
      nameLabel: 'Church name',
      branchLabel: 'Branch name'
    },
    event: {
      singular: 'Program',
      plural: 'Programs',
      session: 'Service',
      create: 'Create Program',
      createNew: 'Create New Program',
      all: 'All Programs',
      recent: 'Recent Programs',
      total: 'Total Programs',
      upcoming: 'Upcoming Programs',
      titleLabel: 'Program Title',
      titlePlaceholder: 'e.g., Sunday Service, Revival Hub'
    },
    attendee: {
      singular: 'Attendee',
      plural: 'Attendees',
      guest: 'Visitor'
    },
    host: {
      singular: 'Pastor',
      admin: 'Administrator'
    },
    dashboard: {
      emptyState: 'No programs found for this filter.',
      deleteConfirm: 'Are you sure you want to delete "{title}"? This will permanently remove all its data.',
      deleteSuccess: 'Program deleted successfully!',
      deleteFailure: 'Failed to delete program.',
      totalTitle: 'Total Programs',
      upcomingTitle: 'Upcoming Programs'
    },
    scan: {
      success: 'You have been checked in successfully. Enjoy the service!',
      giftHelper: 'Fill this form for a chance to win a special gift from the church.',
      noWin: 'You did not win this time, but we are glad you are here. Enjoy the rest of the service.',
      closedTitle: 'Program Already Closed',
      closedBody: 'This program may have ended or may no longer be active.',
      alreadyScanned: 'You have already scanned the QR code. Each device can only scan once per program.'
    },
    landing: {
      segmentLabel: 'Built for church teams'
    }
  }
};

export const eventTemplateOptions = Object.values(eventTemplates).map(({ id, name }) => ({
  id,
  name
}));

export const getEventTemplate = (templateKey) => (
  eventTemplates[templateKey] || eventTemplates[DEFAULT_EVENT_TEMPLATE]
);
