import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

/**
 * Guards the palette against regressions: every text/background pair the UI relies on must
 * meet WCAG AA (4.5:1 for text, 3:1 for graphics). Reads the real stylesheet, so editing a
 * colour in styles.css without checking contrast fails here.
 */

const css = readFileSync(new URL('../../../styles.css', import.meta.url), 'utf8');

type Rgb = readonly [number, number, number];

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function blend(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(fg[i] * alpha + bg[i] * (1 - alpha))) as unknown as Rgb;
}

function themeColors(name: string): Record<string, Rgb> {
  const blocks = css.match(/@plugin "daisyui\/theme" \{[^}]*\}/g) ?? [];
  const block = blocks.find((b) => b.includes(`name: "${name}"`));
  assert.ok(block, `theme ${name} not found in styles.css`);
  const colors: Record<string, Rgb> = {};
  for (const m of block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    colors[m[1]] = hexToRgb(m[2]);
  }
  return colors;
}

function planVars(selector: string): Record<string, string> {
  const re = new RegExp(`\\[data-theme='${selector}'\\]\\s*\\{([^}]*)\\}`);
  const body = css.match(re)?.[1];
  assert.ok(body, `plan variables for ${selector} not found`);
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--plan-([a-z-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

for (const theme of ['ichnos-light', 'ichnos-dark'] as const) {
  describe(theme, () => {
    const c = themeColors(theme);
    const at = (key: string): Rgb => {
      const v = c[key];
      assert.ok(v, `missing --color-${key}`);
      return v;
    };

    it('body text meets AA on every surface', () => {
      for (const surface of ['base-100', 'base-200', 'base-300']) {
        assert.ok(contrast(at('base-content'), at(surface)) >= 4.5, `base-content on ${surface}`);
      }
    });

    it('muted text (base-content at 70%) meets AA on every surface', () => {
      for (const surface of ['base-100', 'base-200', 'base-300']) {
        const muted = blend(at('base-content'), at(surface), 0.7);
        assert.ok(contrast(muted, at(surface)) >= 4.5, `muted text on ${surface}`);
      }
    });

    it('button text meets AA on each role colour', () => {
      for (const role of ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error']) {
        assert.ok(contrast(at(`${role}-content`), at(role)) >= 4.5, `${role}-content on ${role}`);
      }
    });

    it('role colours used as text meet AA on the page background', () => {
      for (const role of ['primary', 'secondary', 'info', 'success', 'warning', 'error']) {
        assert.ok(contrast(at(role), at('base-100')) >= 4.5, `${role} on base-100`);
      }
    });

    it('plan labels and walls are legible on their backgrounds', () => {
      const p = planVars(theme);
      const hex = (key: string): Rgb => {
        const v = p[key];
        assert.ok(v && v.startsWith('#'), `--plan-${key} must be a hex colour`);
        return hexToRgb(v);
      };
      assert.ok(contrast(hex('room-label'), hex('room-fill')) >= 4.5, 'room label on room fill');
      assert.ok(contrast(hex('comp-label'), at('base-200')) >= 4.5, 'component label on canvas');
      assert.ok(contrast(hex('wall'), at('base-200')) >= 3, 'wall on canvas');
    });
  });
}
