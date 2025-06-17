import tinycolor from 'tinycolor2';

export type VariableType = 'color' | 'number' | 'other';
export type ColorFormat = 'hex' | 'rgba' | 'hsla' | 'oklch';

interface ParsedNumber {
  value: number;
  unit: string;
}

// New interfaces for contextual CSS variable detection
export interface CSSVariableContext {
  selector: string;
  condition?: string; // For @media, @supports, etc.
  conditionType?: 'media' | 'supports' | 'container' | 'layer';
  specificity: number;
  value: string; // The actual value in this context
}

export interface ContextualCSSVariable {
  name: string;
  value: string;
  contexts: CSSVariableContext[];
  isRewritten: boolean; // True if this variable is overridden in different contexts
}

export function isColor(value: string): boolean {
  // Also accept OKLCH format
  if (value.toLowerCase().startsWith('oklch(')) {
    return true;
  }
  return tinycolor(value).isValid();
}

export function parseNumberWithUnit(value: string): ParsedNumber | null {
  const match = value.match(/^(-?\d*\.?\d+)([a-zA-Z%]+)$/);
  if (!match) return null;

  return {
    value: parseFloat(match[1]),
    unit: match[2]
  };
}

export function getVariableType(value: string): VariableType {
  if (isColor(value)) return 'color';
  if (parseNumberWithUnit(value)) return 'number';
  return 'other';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function parseMediaQuery(mediaText: string): string {
  // Clean up and format media query for display
  return mediaText.replace(/^\s*and\s*/i, '').trim();
}

export function getContextSpecificity(context: CSSVariableContext): number {
  // Simple specificity calculation - media queries override base styles
  let specificity = 0;

  if (context.condition) {
    specificity += 100; // At-rules have higher specificity
  }

  if (context.selector === ':root') {
    specificity += 10;
  } else {
    // Count specificity based on selector complexity
    const selectorParts = context.selector.split(/[\s>+~,]/);
    specificity += selectorParts.length;
  }

  return specificity;
}

export function detectContextualVariables(): ContextualCSSVariable[] {
  console.log('[Dials] Starting contextual variable detection...');

  // Map to store all variable occurrences
  const variableOccurrences = new Map<string, CSSVariableContext[]>();

  const stylesheets = document.styleSheets;
  console.log(`[Dials] Found ${stylesheets.length} stylesheets`);

  for (let i = 0; i < stylesheets.length; i++) {
    const sheet = stylesheets[i];
    let rules: CSSRuleList;

    try {
      rules = sheet.cssRules;
      console.log(`[Dials] Stylesheet ${i}: ${rules.length} rules`);
    } catch (e) {
      console.log(`[Dials] Stylesheet ${i}: Access denied (CORS)`);
      continue;
    }

    collectVariables(Array.from(rules), variableOccurrences);
  }

  console.log(`[Dials] Found variables:`, Array.from(variableOccurrences.keys()));

  // Process into contextual variables
  const contextualVariables: ContextualCSSVariable[] = [];

  for (const [variableName, contexts] of variableOccurrences.entries()) {
    if (contexts.length === 0) continue;

    // Find base value (from :root without conditions)
    const baseContext = contexts.find(c => c.selector === ':root' && !c.condition);
    const baseValue = baseContext?.value || contexts[0].value;

    // Check if this variable has different values in different contexts
    const uniqueValues = new Set(contexts.map(c => c.value));
    const isRewritten = uniqueValues.size > 1;

    console.log(`[Dials] Variable ${variableName}:`, {
      contexts: contexts.length,
      uniqueValues: Array.from(uniqueValues),
      isRewritten
    });

    // Only include if it's actually rewritten OR if we want to show all variables
    if (isRewritten) {
      contextualVariables.push({
        name: variableName,
        value: baseValue,
        contexts: contexts.sort((a, b) => getContextSpecificity(a) - getContextSpecificity(b)),
        isRewritten
      });
    }
  }

  console.log(`[Dials] Returning ${contextualVariables.length} contextual variables`);
  return contextualVariables;
}

function collectVariables(
  rules: CSSRule[],
  variableOccurrences: Map<string, CSSVariableContext[]>,
  parentCondition?: { condition: string; conditionType: 'media' | 'supports' | 'container' | 'layer' }
) {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      // Process style rule
      const selectorText = rule.selectorText;

      // Extract CSS variables from this rule
      for (let i = 0; i < rule.style.length; i++) {
        const property = rule.style[i];
        if (property.startsWith('--')) {
          const value = rule.style.getPropertyValue(property).trim();

          const context: CSSVariableContext = {
            selector: selectorText,
            condition: parentCondition?.condition,
            conditionType: parentCondition?.conditionType,
            specificity: 0,
            value: value
          };
          context.specificity = getContextSpecificity(context);

          if (!variableOccurrences.has(property)) {
            variableOccurrences.set(property, []);
          }
          variableOccurrences.get(property)!.push(context);

          console.log(`[Dials] Found variable: ${property} = ${value} in ${selectorText}${parentCondition ? ` (${parentCondition.conditionType}: ${parentCondition.condition})` : ''}`);
        }
      }
    } else if (rule instanceof CSSMediaRule) {
      // Process media query
      console.log(`[Dials] Processing media rule: ${rule.media.mediaText}`);
      collectVariables(
        Array.from(rule.cssRules),
        variableOccurrences,
        { condition: rule.media.mediaText, conditionType: 'media' }
      );
    } else if (rule instanceof CSSSupportsRule) {
      // Process supports rule
      console.log(`[Dials] Processing supports rule: ${rule.conditionText}`);
      collectVariables(
        Array.from(rule.cssRules),
        variableOccurrences,
        { condition: rule.conditionText, conditionType: 'supports' }
      );
    } else if ('cssRules' in rule && rule.cssRules) {
      // Process other nested rules
      collectVariables(Array.from(rule.cssRules as CSSRuleList), variableOccurrences, parentCondition);
    }
  }
}

export function getCurrentActiveContexts(): string[] {
  const activeContexts: string[] = [];

  // Always add the base context
  activeContexts.push('base');

  // Check media queries that are currently matching
  const mediaQueries = [
    { query: '(max-width: 768px)', name: 'mobile' },
    { query: '(min-width: 769px) and (max-width: 1024px)', name: 'tablet' },
    { query: '(min-width: 1400px)', name: 'large-screen' },
    { query: '(prefers-color-scheme: dark)', name: 'dark-theme' },
    { query: '(prefers-contrast: high)', name: 'high-contrast' },
    { query: '(prefers-reduced-motion: reduce)', name: 'reduced-motion' }
  ];

  mediaQueries.forEach(({ query, name }) => {
    if (window.matchMedia(query).matches) {
      activeContexts.push(name);
    }
  });

  return activeContexts;
}

export function getActiveContextForVariable(variable: ContextualCSSVariable): CSSVariableContext | null {
  // Find the most specific matching context
  // Sort by specificity (higher is more specific)
  const sortedContexts = [...variable.contexts].sort((a, b) => getContextSpecificity(b) - getContextSpecificity(a));

  for (const context of sortedContexts) {
    if (!context.condition) {
      // Base context - always matches but has lowest priority
      continue;
    }

    // Check if this context's media query is currently active
    if (context.conditionType === 'media' && window.matchMedia(context.condition).matches) {
      return context;
    }
  }

  // Fall back to base context
  return variable.contexts.find(c => c.selector === ':root' && !c.condition) || null;
}

export function getVariableValueForContext(variable: ContextualCSSVariable, context: CSSVariableContext): string {
  return context.value;
}

function rgbToOklch(r: number, g: number, b: number, alpha: number): string {
  // Normalize RGB values to 0-1
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  // Convert to linear RGB
  const rl = rn <= 0.04045 ? rn / 12.92 : Math.pow((rn + 0.055) / 1.055, 2.4);
  const gl = gn <= 0.04045 ? gn / 12.92 : Math.pow((gn + 0.055) / 1.055, 2.4);
  const bl = bn <= 0.04045 ? bn / 12.92 : Math.pow((bn + 0.055) / 1.055, 2.4);

  // Convert to Oklab
  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // Convert to LCH
  const C = Math.sqrt(A * A + B * B);
  let h = Math.atan2(B, A) * 180 / Math.PI;

  // Normalize hue to 0-360
  if (h < 0) {
    h += 360;
  }

  // Format with reasonable precision and ranges
  const lightness = clamp(L * 100, 0, 100).toFixed(1);
  const chroma = clamp(C * 100, 0, 100).toFixed(1);
  const hue = Math.round(h);

  return `oklch(${lightness}% ${chroma} ${hue}deg${alpha !== 1 ? ` / ${alpha.toFixed(2)}` : ''})`;
}

export function formatColor(color: tinycolor.Instance, format: ColorFormat): string {
  switch (format) {
    case 'hex': {
      const { a } = color.toRgb();
      return a < 1 ? color.toHex8String() : color.toHexString();
    }
    case 'rgba': {
      const { r, g, b, a } = color.toRgb();
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    case 'hsla': {
      const { h, s, l, a } = color.toHsl();
      return `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;
    }
    case 'oklch': {
      const { r, g, b, a } = color.toRgb();
      return rgbToOklch(r, g, b, a);
    }
  }
}

export function getColorInfo(color: tinycolor.Instance): Record<ColorFormat, string> {
  return {
    hex: formatColor(color, 'hex'),
    rgba: formatColor(color, 'rgba'),
    hsla: formatColor(color, 'hsla'),
    oklch: formatColor(color, 'oklch')
  };
}