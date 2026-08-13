import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeTranscript(
  transcriptPath: string,
  body: string,
): Promise<void> {
  await mkdir(path.dirname(transcriptPath), { recursive: true });
  await writeFile(transcriptPath, body, "utf8");
}
