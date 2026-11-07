/**
 * Central registry for camera/microphone streams.
 *
 * Every getUserMedia call in the app goes through acquireMedia() so that
 * stopAllMedia() can reliably release the camera and mic when an assessment
 * ends or the student leaves, even if a component forgot to clean up or a
 * permission prompt resolved after the component unmounted.
 */
const activeStreams = new Set<MediaStream>();

export async function acquireMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  activeStreams.add(stream);
  return stream;
}

export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
  activeStreams.delete(stream);
}

export function stopAllMedia(): void {
  activeStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  activeStreams.clear();
}
