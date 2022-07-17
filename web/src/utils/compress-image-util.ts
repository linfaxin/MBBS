import Compressor from 'compressorjs';

const CheckOrientationSizeLimit = 5 * 1024 * 1024;

export function compressImageFile(data: Blob, option?: Compressor.Options): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    new Compressor(data, {
      quality: 0.8,
      checkOrientation: data.size < CheckOrientationSizeLimit,
      mimeType: 'image/jpeg',
      ...option,
      success(result) {
        resolve(result);
      },
      error(err) {
        reject(err);
      },
    });
  });
}
