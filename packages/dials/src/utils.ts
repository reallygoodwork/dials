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
  const variableMap = new Map<string, ContextualCSSVariable>();

  const stylesheets = document.styleSheets;

  for (const sheet of Array.from(stylesheets)) {
    let rules: CSSRuleList;

    try {
      rules = sheet.cssRules;
    } catch (e) {
      continue;
    }

    processRules(Array.from(rules), variableMap);
  }

  // Mark variables as rewritten if they appear in multiple contexts
  for (const variable of variableMap.values()) {
    variable.isRewritten = variable.contexts.length > 1;
    // Sort contexts by specificity
    variable.contexts.sort((a, b) => getContextSpecificity(a) - getContextSpecificity(b));
  }

  return Array.from(variableMap.values());
}

function processRules(rules: CSSRule[], variableMap: Map<string, ContextualCSSVariable>, parentCondition?: CSSVariableContext) {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      // Regular style rule
      const context: CSSVariableContext = {
        selector: rule.selectorText,
        condition: parentCondition?.condition,
        conditionType: parentCondition?.conditionType,
        specificity: 0
      };
      context.specificity = getContextSpecificity(context);

      extractVariablesFromStyle(rule.style, context, variableMap);
    } else if (rule instanceof CSSMediaRule) {
      // Media query rule
      const mediaContext: CSSVariableContext = {
        selector: '',
        condition: rule.media.mediaText,
        conditionType: 'media',
        specificity: 0
      };

      processRules(Array.from(rule.cssRules), variableMap, mediaContext);
    } else if (rule instanceof CSSSupportsRule) {
      // Supports rule
      const supportsContext: CSSVariableContext = {
        selector: '',
        condition: rule.conditionText,
        conditionType: 'supports',
        specificity: 0
      };

      processRules(Array.from(rule.cssRules), variableMap, supportsContext);
    } else if ('cssRules' in rule && rule.cssRules) {
      // Other at-rules that contain nested rules
      processRules(Array.from(rule.cssRules as CSSRuleList), variableMap, parentCondition);
    }
  }
}

function extractVariablesFromStyle(style: CSSStyleDeclaration, context: CSSVariableContext, variableMap: Map<string, ContextualCSSVariable>) {
  for (const prop of style) {
    if (prop.startsWith("--")) {
      const value = style.getPropertyValue(prop).trim();

      if (!variableMap.has(prop)) {
        variableMap.set(prop, {
          name: prop,
          value: value,
          contexts: [],
          isRewritten: false
        });
      }

      const variable = variableMap.get(prop)!;

      // Add this context if it's not already present
      const existingContext = variable.contexts.find(c =>
        c.selector === context.selector &&
        c.condition === context.condition &&
        c.conditionType === context.conditionType
      );

      if (!existingContext) {
        variable.contexts.push({...context});
      }

      // Update value if this context has higher specificity
      if (getContextSpecificity(context) >= getContextSpecificity(variable.contexts[variable.contexts.length - 1])) {
        variable.value = value;
      }
    }
  }
}