/** A plugin skill: its source, with each shared part in place of the line `{{name}}`. */
export function composeSkill(source: string, shared: Record<string, string>): string {
  return source.replace(/^\{\{([a-z-]+)\}\}\n/gm, (_line, name: string) => {
    const part = shared[name];
    if (part === undefined) throw new Error(`No shared part ${name}`);
    return part;
  });
}
