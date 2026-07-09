const VAR_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

/** Ganti {{key}} dengan nilai dari variables. */
export function applyVariables(text: string, variables: Record<string, string>): string {
  return text.replace(VAR_PATTERN, (whole, key: string) =>
    key in variables ? variables[key] : whole
  );
}
