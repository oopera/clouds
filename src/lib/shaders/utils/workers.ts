import type { RenderOptions } from '$lib/types/types';

export async function CreateSphereData(options: RenderOptions): Promise<any> {
  const worker: Worker = new Worker(
    new URL('$lib/shaders/primitives/sphere.ts', import.meta.url),
    { type: 'module' }
  );

  let data: any = null;

  worker.onerror = function (event: ErrorEvent) {
    console.error('WORKER ERROR', event);
    throw new Error(event.message);
  };

  worker.onmessage = (e: MessageEvent) => {
    const receivedData = e.data;
    data = receivedData;
  };

  worker.postMessage({ numFs: options.numFs });

  const startTime = Date.now();
  const timeout = 10000;

  while (!data) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for worker response');
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  options.amountOfVertices = data.vertexData.length / 3;

  return data;
}
