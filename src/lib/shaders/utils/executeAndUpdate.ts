import { loading } from '$lib/stores/stores';

export async function executePromise(
  key: string,
  promise: Promise<any>,
  message: string
) {
  let progress = 0;

  loading.update((current) => {
    const id = Object.keys(current).length;
    return {
      ...current,
      [key]: {
        id,
        status: true,
        message,
        progress,
      },
    };
  });

  let data;
  try {
    data = await promise;
  } catch (error) {
    console.error(`Error while executing promise for key: ${key}`, error);
  }

  while (!data) {
    progress += 1;

    loading.update((current) => {
      return {
        ...current,
        [key]: {
          id: Object.keys(current).length,
          status: true,
          message,
          progress,
        },
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  loading.update((current) => {
    return {
      ...current,
      [key]: {
        id: Object.keys(current).length,
        status: false,
        message,
        progress: 100,
      },
    };
  });

  return data;
}

export async function loadImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
