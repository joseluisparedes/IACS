/**
 * stt.worker.ts
 * Runs Whisper-tiny (multilingual) 100% locally in the browser
 * via @xenova/transformers + ONNX Runtime WASM.
 * Model (~40 MB) is downloaded once from HuggingFace CDN and cached.
 * No API key or external transcription service required.
 */

// Vite worker bundles this as an ES module — @xenova/transformers is ESM-compatible.
import { pipeline, env } from '@xenova/transformers';

// Use CDN model files; disable local model search (we have none bundled)
env.allowLocalModels = false;
env.allowRemoteModels = true;
// Force single-thread ONNX backend to avoid SharedArrayBuffer issues on plain HTTP
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

type AnyPipeline = Awaited<ReturnType<typeof pipeline>>;
let transcriber: AnyPipeline | null = null;
let loadingPromise: Promise<void> | null = null;

function loadModel(onProgress: (pct: number) => void): Promise<void> {
  if (transcriber) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-tiny',
    {
      // @ts-ignore progress_callback is valid but not in TS types
      progress_callback: (info: any) => {
        if (info?.status === 'progress' && typeof info.progress === 'number') {
          onProgress(Math.round(info.progress));
        }
      },
    }
  ).then((p) => {
    transcriber = p;
    loadingPromise = null;
  });

  return loadingPromise;
}

self.onmessage = async (e: MessageEvent<{ type: string; audio?: Float32Array }>) => {
  const { type, audio } = e.data;

  if (type === 'load') {
    try {
      await loadModel((pct) => self.postMessage({ type: 'loading', progress: pct }));
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: 'Error al cargar modelo Whisper: ' + err.message });
    }
    return;
  }

  if (type === 'transcribe' && audio) {
    try {
      if (!transcriber) {
        await loadModel(() => {});
      }
      // @ts-ignore
      const result = await transcriber!(audio, {
        language: 'spanish',
        task: 'transcribe',
        chunk_length_s: 30,
      });

      const text = Array.isArray(result)
        ? result.map((r: any) => r.text ?? '').join(' ').trim()
        : ((result as any).text ?? '').trim();

      self.postMessage({ type: 'result', text });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: 'Error al transcribir: ' + err.message });
    }
    return;
  }
};
