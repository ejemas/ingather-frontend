const TARGET_SIZE_BYTES = 200 * 1024;
const MAX_SIZE_BYTES = 260 * 1024;
const MAX_DIMENSION = 1600;
const MIN_DIMENSION = 720;
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const loadImage = (file) => (
  new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read the selected image.'));
    };

    image.src = url;
  })
);

const canvasToBlob = (canvas, quality) => (
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Image compression failed.'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', quality);
  })
);

const getScaledSize = (width, height, maxDimension) => {
  const largestSide = Math.max(width, height);
  if (largestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / largestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
};

const drawImage = (image, maxDimension) => {
  const { width, height } = getScaledSize(image.naturalWidth, image.naturalHeight, maxDimension);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas;
};

export const formatFileSize = (size) => {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const compressFlyerImage = async (file) => {
  if (!file) return null;

  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPEG, PNG, or WebP flyer.');
  }

  const image = await loadImage(file);
  let maxDimension = MAX_DIMENSION;
  let compressedBlob = null;

  while (maxDimension >= MIN_DIMENSION) {
    const canvas = drawImage(image, maxDimension);

    for (let quality = 0.82; quality >= 0.46; quality -= 0.08) {
      compressedBlob = await canvasToBlob(canvas, quality);
      if (compressedBlob.size <= TARGET_SIZE_BYTES) {
        return new File(
          [compressedBlob],
          `${file.name.replace(/\.[^.]+$/, '') || 'event-flyer'}.jpg`,
          { type: 'image/jpeg', lastModified: Date.now() }
        );
      }
    }

    maxDimension -= 220;
  }

  if (compressedBlob && compressedBlob.size <= MAX_SIZE_BYTES) {
    return new File(
      [compressedBlob],
      `${file.name.replace(/\.[^.]+$/, '') || 'event-flyer'}.jpg`,
      { type: 'image/jpeg', lastModified: Date.now() }
    );
  }

  throw new Error('This flyer could not be compressed enough. Please choose a smaller image.');
};

export const fileToDataUrl = (file) => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to prepare flyer for upload.'));
    reader.readAsDataURL(file);
  })
);
