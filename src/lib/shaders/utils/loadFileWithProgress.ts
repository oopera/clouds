import { loading } from '$lib/stores/stores';

export function loadFileWithProgress(
  key: string,
  url: string,
  message: string
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = function (event) {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;

        loading.update((current) => ({
          ...current,
          [key]: {
            id: Object.keys(current).length,
            status: true,
            message,
            progress,
          },
        }));
      }
    };

    xhr.onload = function () {
      if (this.status === 200) {
        const blob = new Blob([this.response], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);

        loading.update((current) => ({
          ...current,
          [key]: {
            id: Object.keys(current).length,
            status: false,
            message,
            progress: 100,
          },
        }));

        resolve(objectUrl);
      }
    };

    xhr.onerror = function () {
      reject(new Error('File download failed.'));
    };

    xhr.send();
  });
}
