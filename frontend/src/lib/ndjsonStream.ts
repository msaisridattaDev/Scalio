export async function* streamNdjson<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) throw new Error("Response has no readable body — streaming not supported here.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      yield JSON.parse(line) as T;
    }
  }
  if (buffer.trim()) {
    yield JSON.parse(buffer) as T;
  }
}
