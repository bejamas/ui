export function serializeInlineScriptValue(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003C")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildWindowAssignmentInlineScript(
  propertyName: string,
  value: unknown,
) {
  return `window.${propertyName} = ${serializeInlineScriptValue(value)};`;
}
