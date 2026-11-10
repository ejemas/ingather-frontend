import API from './axios';

export const getHelpTickets = async () => {
  const response = await API.get('/help/tickets');
  return response.data;
};

export const getHelpEventOptions = async () => {
  const response = await API.get('/help/events');
  return response.data;
};

export const createHelpTicket = async (data) => {
  const response = await API.post('/help/tickets', data);
  return response.data;
};

export const getHelpTicket = async (number) => {
  const response = await API.get(`/help/tickets/${encodeURIComponent(number)}`);
  return response.data;
};

export const replyToHelpTicket = async (number, data) => {
  const response = await API.post(`/help/tickets/${encodeURIComponent(number)}/messages`, data);
  return response.data;
};

export const solveHelpTicket = async (number) => {
  const response = await API.put(`/help/tickets/${encodeURIComponent(number)}/solve`);
  return response.data;
};

// Screenshots: PNG or JPEG up to 5 MB. Large ones are shrunk in the browser before sending.
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const KEEP_AS_IS_BYTES = 1.5 * 1024 * 1024;
const MAX_SIDE = 2000;

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('We could not read that image.'));
  reader.readAsDataURL(blob);
});

export const prepareScreenshot = async (file) => {
  if (!file) return null;
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Use a PNG or JPEG screenshot.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That screenshot is over 5 MB. Use a smaller one.');
  if (file.size <= KEEP_AS_IS_BYTES) return { dataUrl: await readAsDataUrl(file), name: file.name };

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('We could not read that image.'));
      img.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('We could not prepare that image.');
    return { dataUrl: await readAsDataUrl(blob), name: file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg' };
  } finally {
    URL.revokeObjectURL(url);
  }
};
