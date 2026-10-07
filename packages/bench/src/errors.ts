/** An expected failure with a message that is safe to print without a stack. */
export class BenchError extends Error {
  override name = "BenchError";
}
