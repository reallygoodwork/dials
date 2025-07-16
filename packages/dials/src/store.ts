import { create } from 'zustand';
import { ContextualCSSVariable, CSSVariableContext, getActiveContextForVariable } from './utils';

export interface CSSVariable {
  name: string;
  value: string;
  mediaQuery?: string;
}

export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PanelState {
  position: PanelPosition;
  isDragging: boolean;
  customPosition?: { x: number; y: number };
}

export interface DialsState {
  variables: CSSVariable[];
  contextualVariables: ContextualCSSVariable[];
  originalValues: { [name: string]: string };
  userChanges: { [name: string]: string }; // Track user-made changes
  contextualUserChanges: { [variableName: string]: { [contextKey: string]: string } }; // Track changes per context
  activeMediaQuery: string | null;
  showContextualView: boolean;
  panelState: PanelState;
  setVariables: (variables: CSSVariable[]) => void;
  setContextualVariables: (variables: ContextualCSSVariable[]) => void;
  setOriginalValues: (values: { [name: string]: string }) => void;
  setActiveMediaQuery: (query: string | null) => void;
  setShowContextualView: (show: boolean) => void;
  updateVariable: (name: string, value: string) => void;
  updateContextualVariable: (name: string, value: string, context?: CSSVariableContext, selectedContextOverride?: string) => void;
  resetVariable: (name: string) => void;
  resetAllVariables: () => void;
  getContextInfo: (variableName: string) => CSSVariableContext[];
  getRewrittenVariables: () => ContextualCSSVariable[];
  isUserChanged: (variableName: string) => boolean;
  getCurrentActiveContext: (variable: ContextualCSSVariable) => CSSVariableContext | null;
  updateContextualCSS: () => void;
  setPanelPosition: (position: PanelPosition) => void;
  setCustomPosition: (position: { x: number; y: number }) => void;
  setDragging: (isDragging: boolean) => void;
}

// Style element for injecting contextual CSS
let dialsStyleElement: HTMLStyleElement | null = null;

// Get or create the style element for contextual CSS
const getDialsStyleElement = () => {
  if (!dialsStyleElement) {
    dialsStyleElement = document.createElement('style');
    dialsStyleElement.id = 'dials-contextual-styles';
    document.head.appendChild(dialsStyleElement);
  }
  return dialsStyleElement;
};

export const useDialsStore = create<DialsState>((set, get) => ({
  variables: [],
  contextualVariables: [],
  originalValues: {},
  userChanges: {},
  contextualUserChanges: {},
  activeMediaQuery: null,
  showContextualView: false,
  panelState: {
    position: (localStorage.getItem('dials-panel-position') as PanelPosition) || 'top-right',
    isDragging: false,
    customPosition: (() => {
      try {
        const saved = localStorage.getItem('dials-panel-custom-position');
        return saved ? JSON.parse(saved) : undefined;
      } catch {
        return undefined;
      }
    })(),
  },

  setVariables: (variables) => set({ variables }),
  setContextualVariables: (variables) => set({ contextualVariables: variables }),
  setOriginalValues: (values) => set({ originalValues: values }),
  setActiveMediaQuery: (query) => set({ activeMediaQuery: query }),
  setShowContextualView: (show) => set({ showContextualView: show }),

  updateVariable: (name, value) => {
    console.log(`[Dials] Updating ${name} to: ${value}`);

    // Track this as a user change
    set((state) => ({
      userChanges: { ...state.userChanges, [name]: value }
    }));

    // Update the store state
    set((state) => ({
      variables: state.variables.map((v) =>
        v.name === name ? { ...v, value } : v
      ),
      contextualVariables: state.contextualVariables.map((v) =>
        v.name === name ? { ...v, value } : v
      ),
    }));

    // Regenerate all contextual CSS
    get().updateContextualCSS();
  },

  updateContextualVariable: (name, value, context, selectedContextOverride) => {
    console.log(`[Dials] Updating contextual ${name} to: ${value}`, context, selectedContextOverride);

    const state = get();
    const variable = state.contextualVariables.find(v => v.name === name);

    if (!variable) return;

    // Determine which context we're editing
    let targetContext = context;
    
    if (!targetContext && selectedContextOverride) {
      if (selectedContextOverride === 'base') {
        targetContext = variable.contexts.find(c => !c.condition);
      } else {
        targetContext = variable.contexts.find(c => c.condition === selectedContextOverride);
      }
    }
    
    if (!targetContext) {
      targetContext = getActiveContextForVariable(variable) || undefined;
    }
    
    if (!targetContext) return;

    // Create a context key for tracking changes
    const contextKey = targetContext.condition || 'base';

    // Track this as a contextual user change
    set((state) => ({
      contextualUserChanges: {
        ...state.contextualUserChanges,
        [name]: {
          ...state.contextualUserChanges[name],
          [contextKey]: value
        }
      }
    }));

    // Update the store state
    set((state) => ({
      contextualVariables: state.contextualVariables.map((v) =>
        v.name === name ? { ...v, value } : v
      ),
    }));

    // Regenerate all contextual CSS
    get().updateContextualCSS();
  },

  resetVariable: (name) => {
    const state = get();
    const originalValue = state.originalValues[name];

    if (originalValue !== undefined) {
      console.log(`[Dials] Resetting ${name} to: ${originalValue}`);

      // Remove from user changes
      const newUserChanges = { ...state.userChanges };
      delete newUserChanges[name];

      const newContextualUserChanges = { ...state.contextualUserChanges };
      delete newContextualUserChanges[name];

      set({
        userChanges: newUserChanges,
        contextualUserChanges: newContextualUserChanges
      });

      // Update the store state
      set((state) => ({
        variables: state.variables.map((v) =>
          v.name === name ? { ...v, value: originalValue } : v
        ),
        contextualVariables: state.contextualVariables.map((v) =>
          v.name === name ? { ...v, value: originalValue } : v
        ),
      }));

      // Regenerate all contextual CSS
      get().updateContextualCSS();
    }
  },

  resetAllVariables: () => {
    console.log(`[Dials] Resetting all variables`);

    // Clear all user changes
    set({ userChanges: {}, contextualUserChanges: {} });

    // Update store with original values
    set((state) => ({
      variables: state.variables.map((v) => {
        const originalValue = state.originalValues[v.name];
        if (originalValue !== undefined) {
          return { ...v, value: originalValue };
        }
        return v;
      }),
      contextualVariables: state.contextualVariables.map((v) => {
        const originalValue = state.originalValues[v.name];
        if (originalValue !== undefined) {
          return { ...v, value: originalValue };
        }
        return v;
      }),
    }));

    // Clear all contextual CSS (since there are no user changes)
    const styleElement = getDialsStyleElement();
    styleElement.textContent = '';
  },

  getContextInfo: (variableName) => {
    const state = get();
    const contextualVar = state.contextualVariables.find(v => v.name === variableName);
    return contextualVar?.contexts || [];
  },

  getRewrittenVariables: () => {
    const state = get();
    return state.contextualVariables.filter(v => v.isRewritten);
  },

  isUserChanged: (variableName) => {
    const state = get();
    return variableName in state.userChanges || variableName in state.contextualUserChanges;
  },

  getCurrentActiveContext: (variable) => {
    return getActiveContextForVariable(variable);
  },

  // Generate and inject contextual CSS rules
  updateContextualCSS: () => {
    const state = get();
    const styleElement = getDialsStyleElement();
    const cssRules: string[] = [];

    // Collect all base changes (both regular userChanges and contextual base changes)
    const baseChanges: string[] = [];
    
    // Add regular user changes for variables that don't have contextual overrides
    Object.entries(state.userChanges).forEach(([variableName, value]) => {
      if (!state.contextualUserChanges[variableName]) {
        baseChanges.push(`  ${variableName}: ${value};`);
      }
    });

    // Add base contextual changes
    Object.entries(state.contextualUserChanges).forEach(([variableName, contexts]) => {
      if (contexts.base) {
        baseChanges.push(`  ${variableName}: ${contexts.base};`);
      }
    });

    // Add base :root rule if there are any base changes
    if (baseChanges.length > 0) {
      cssRules.push(`:root {\n${baseChanges.join('\n')}\n}`);
    }

    // Add non-base contextual changes
    Object.entries(state.contextualUserChanges).forEach(([variableName, contexts]) => {
      Object.entries(contexts).forEach(([contextKey, value]) => {
        if (contextKey !== 'base') {
          // Non-base contextual changes go in media queries
          cssRules.push(`@media ${contextKey} {\n  :root {\n    ${variableName}: ${value};\n  }\n}`);
        }
      });
    });

    // Update the style element content
    styleElement.textContent = cssRules.join('\n\n');
  },

  setPanelPosition: (position) => {
    set((state) => ({
      panelState: {
        ...state.panelState,
        position,
        customPosition: undefined, // Clear custom position when using preset
      }
    }));
    
    // Persist position to localStorage
    localStorage.setItem('dials-panel-position', position);
  },

  setCustomPosition: (customPosition) => {
    set((state) => ({
      panelState: {
        ...state.panelState,
        customPosition,
      }
    }));
    
    // Persist custom position to localStorage
    localStorage.setItem('dials-panel-custom-position', JSON.stringify(customPosition));
  },

  setDragging: (isDragging) => {
    set((state) => ({
      panelState: {
        ...state.panelState,
        isDragging,
      }
    }));
  },

}));