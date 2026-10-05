import siteData from './site.json';

// Editable in Keystatic (Site settings singleton). nav is structural → stays in code.
export const site = {
  name: siteData.name,
  role: siteData.role,
  summary: siteData.summary,
  blurb: siteData.blurb,
  email: siteData.email,
};

export const socials = siteData.socials;

// Curated nav (not every section gets a link, to keep the bar from overflowing).
export const nav = [
  { id: 'research', label: 'Research' },
  { id: 'software', label: 'Software' },
  { id: 'talks', label: 'Talks' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'contact', label: 'Contact' },
];
