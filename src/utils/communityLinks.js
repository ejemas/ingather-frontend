export const COMMUNITY_PLATFORMS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'other', label: 'Other' }
];

export const createCommunityLink = () => ({ platform: 'whatsapp', url: '' });

export const isValidCommunityUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

export const getCommunityLabel = (platform) => (
  COMMUNITY_PLATFORMS.find(item => item.value === platform)?.label || 'Community'
);

export const getCommunityCta = (platform) => ({
  whatsapp: 'Join WhatsApp Community',
  instagram: 'Follow on Instagram',
  discord: 'Join Discord Community',
  telegram: 'Join Telegram Community'
}[platform] || 'Join Community');
