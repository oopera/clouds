import { loading } from '$lib/stores/stores';

const displayError = (message: string) => {
  var counter = 0;

  if (counter === 0) {
    loading.set({
      welcome: {
        id: 0,
        status: true,
        message: 'error',
        progress: 0,
      },
    });
  }
  counter++;

  loading.update((current) => {
    const id = Object.keys(current).length;
    return {
      ...current,
      [`Error-${id}`]: {
        id,
        status: true,
        message: counter % 2 === 0 ? 'ERROR ERROR ERROR' : message,
        progress: 0,
      },
    };
  });

  throw new Error(message);
};
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
  } catch (error) {
    const errorMessage = `Error while executing promise for key: ${key}`;
    displayError(errorMessage);
    console.error(errorMessage, error);
    return null; // Return null to indicate an error occurred
  }

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
