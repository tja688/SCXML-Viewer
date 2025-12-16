// src/diagram/elkClient.ts
import ELK from "elkjs/lib/elk-api";
import elkWorkerUrl from "elkjs/lib/elk-worker.min.js?url";

export const elk = new ELK({
  workerUrl: elkWorkerUrl,
});
