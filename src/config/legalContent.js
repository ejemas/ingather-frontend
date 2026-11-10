// Text for the Privacy Policy, Terms of Use and Contact pages.
//
// Fill in the details below. Leave a detail as '' (empty) if you don't have it yet:
// the sentence that uses it is left off the page until you add it back.
// Have a legal adviser review the wording before you rely on it.

export const LEGAL_DETAILS = {
  companyName: 'Ingather',
  address: 'Warri, Delta State, Nigeria',
  lastUpdated: '5 August 2026',
  generalEmail: 'ingatherr@gmail.com',
  supportEmail: 'ingatherr@gmail.com',
  privacyEmail: 'ingatherr@gmail.com',
  securityContact: 'ingatherr@gmail.com',
  retention: '', // e.g. 'We keep event records for as long as the organizer's account is open.'
  responseTime: '24 hours',
  liability: '', // to be written by a legal adviser
  governingLaw: 'the Federal Republic of Nigeria'
};

const d = LEGAL_DETAILS;

export const hasDetail = (value) => String(value || '').trim() !== '';
// Joins sentences, leaving out any that are empty.
const join = (...parts) => parts.filter(hasDetail).join(' ');

export const PRIVACY_SECTIONS = [
  { id: 'who', title: 'Who we are', paras: [`Ingather ("we", "us") runs ingather.app, a platform event organizers use to manage RSVPs, check guests in and see attendance. The company behind it is ${d.companyName}, based in ${d.address}.`] },
  { id: 'roles', title: 'Organizers and guests', paras: ['Organizers create an Ingather account and run events. Guests RSVP to or check in at an organizer\'s event.', 'For guest information, the organizer decides what their form asks for and why. We store and process it on their behalf. If you have a question about a specific event, contact its organizer first.'] },
  {
    id: 'collect',
    title: 'What we collect',
    paras: ['What we hold depends on how you use Ingather.'],
    list: [
      ['Organizers:', 'organization name, team or branch, email address, location, logo and a password (stored only as a secure hash).'],
      ['Guests:', 'whatever the organizer\'s form asks, such as name, email, phone number, gender, age, address, school, department, group, answers to custom questions, how you are attending and your check-in time.'],
      ['Devices:', 'an identifier your browser creates during check-in, used to stop the same phone checking in twice. When you tap a sponsor, we record only a scrambled version of it.'],
      ['Waitlist:', 'name, email, organization, expected event size and the date of your next event.']
    ]
  },
  { id: 'use', title: 'How we use it', paras: ['To run check-ins and RSVPs, email QR passes and verification codes, show organizers their attendance and reports, prevent duplicate check-ins and abuse, and give sponsors total tap counts. We do not use guest information for our own marketing.'] },
  { id: 'share', title: 'Who we share it with', paras: ['The organizer of the event you RSVP to or check in at. Service providers that run Ingather for us: Supabase for database and file storage, Zoho ZeptoMail for email, and Vercel and Render for hosting. We do not sell personal information.'] },
  { id: 'keep', title: 'How long we keep it', paras: [join(d.retention, 'When an organizer deletes an event, its attendee records are deleted with it. Organizers can ask us to close their account and remove their data.')] },
  { id: 'rights', title: 'Your rights', paras: [`Under the Nigeria Data Protection Act 2023 you can ask to see, correct or delete your personal information, or object to how it is used. Email ${d.privacyEmail}. For guest information, we may pass your request to the organizer who collected it.`] },
  { id: 'security', title: 'Security', paras: [`Passwords are hashed, sign-in and reset codes expire after 10 minutes, and QR passes work once. No system is perfectly secure; tell us at ${d.securityContact} if you find a problem.`] },
  { id: 'changes', title: 'Changes and contact', paras: [`We will post updates here and change the date at the top. Questions: ${d.privacyEmail}.`] }
];

export const TERMS_SECTIONS = [
  { id: 'about', title: 'About these terms', paras: ['These terms apply when you use ingather.app, as an organizer or as a guest. By using Ingather you agree to them.'] },
  { id: 'accounts', title: 'Organizer accounts', paras: ['Ingather is currently invite-only. Invite links are personal, last 14 days and work once. Keep your password safe; you are responsible for activity on your account.'] },
  { id: 'organizers', title: 'Your responsibilities as an organizer', paras: ['Only collect guest information you need and have a lawful reason to collect, tell guests why you collect it, and keep event details accurate. You are responsible for your event, your gifts, your sponsors and what they offer.'] },
  { id: 'guests', title: 'Guests', paras: ['Give accurate details when you RSVP or check in. Do not share your QR pass; each pass works once. Check in only yourself and the guests you are allowed to add.'] },
  { id: 'use', title: 'Acceptable use', paras: ['Do not misuse Ingather, including sending spam through RSVP forms, uploading unlawful content, trying to get around limits, or accessing accounts that are not yours.'] },
  { id: 'plan', title: 'Free plan and changes', paras: ['Ingather is free to start. We may change features or limits and will give notice of changes that affect paid plans if we introduce them.'] },
  { id: 'liability', title: 'Availability and liability', paras: [join('We work to keep Ingather running but cannot promise it will always be available.', d.liability)] },
  { id: 'law', title: 'Governing law and contact', paras: [`These terms are governed by the laws of ${d.governingLaw}. Contact ${d.generalEmail}.`] }
];
