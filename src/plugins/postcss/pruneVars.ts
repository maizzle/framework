/**
 * postcss-prune-var
 * Removes unused CSS custom properties.
 */

import type { Declaration, Plugin, Root } from 'postcss';

const PLUGIN_NAME = 'postcss-prune-var';

const VAR_RE = /var\(\s*(--[^ ,);]+)/g;

interface VarRecord {
  uses: number;
  declarations: Set<Declaration>;
  dependencies: Set<string>;
}

export default (): Plugin => {
  return {
    postcssPlugin: PLUGIN_NAME,

    Once(root: Root) {
      const records = new Map<string, VarRecord>();
      const usedVars = new Set<string>();

      const getRecord = (name: string): VarRecord => {
        let r = records.get(name);
        if (!r) {
          r = { uses: 0, declarations: new Set(), dependencies: new Set() };
          records.set(name, r);
        }
        return r;
      };

      const registerUse = (name: string, seen = new Set<string>()) => {
        const r = getRecord(name);
        r.uses++;
        seen.add(name);
        for (const dep of r.dependencies) {
          if (!seen.has(dep)) registerUse(dep, seen);
        }
      };

      // Build dependency graph
      root.walkDecls((decl) => {
        const isVar = decl.prop.startsWith('--');

        if (isVar) getRecord(decl.prop).declarations.add(decl);

        if (!decl.value.includes('var(')) return;

        let m;
        VAR_RE.lastIndex = 0;
        while ((m = VAR_RE.exec(decl.value))) {
          const ref = m[1].trim();
          if (isVar) {
            getRecord(decl.prop).dependencies.add(ref);
          } else {
            usedVars.add(ref);
          }
        }
      });

      // Propagate usage through the graph
      for (const v of usedVars) registerUse(v);

      // Remove declarations with zero uses
      for (const { uses, declarations } of records.values()) {
        if (uses === 0) {
          for (const decl of declarations) decl.remove();
        }
      }
    },
  };
};

export const postcss = true;
