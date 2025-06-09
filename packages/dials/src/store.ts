import { create } from 'zustand';
import { ContextualCSSVariable, CSSVariableContext } from './utils';

export interface CSSVariable {
  name: string;
  value: string;
  mediaQuery?: string;
}

export interface DialsState {
  variables: CSSVariable[];
  contextualVariables: ContextualCSSVariable[];
  originalValues: { [name: string]: string };
  activeMediaQuery: string | null;
  showContextualView: boolean;
  setVariables: (variables: CSSVariable[]) => void;
  setContextualVariables: (variables: ContextualCSSVariable[]) => void;
  setOriginalValues: (values: { [name: string]: string }) => void;
  setActiveMediaQuery: (query: string | null) => void;
  setShowContextualView: (show: boolean) => void;
  updateVariable: (name: string, value: string) => void;
  resetVariable: (name: string) => void;
  resetAllVariables: () => void;
  getContextInfo: (variableName: string) => CSSVariableContext[];
  getRewrittenVariables: () => ContextualCSSVariable[];
}

export const useDialsStore = create<DialsState>((set, get) => ({
  variables: [],
  contextualVariables: [],
  originalValues: {},
  activeMediaQuery: null,
  showContextualView: false,

  setVariables: (variables) => set({ variables }),
  setContextualVariables: (variables) => set({ contextualVariables: variables }),
  setOriginalValues: (values) => set({ originalValues: values }),
  setActiveMediaQuery: (query) => set({ activeMediaQuery: query }),
  setShowContextualView: (show) => set({ showContextualView: show }),

  updateVariable: (name, value) => {
    console.log(`[Dials] Updating ${name} to: ${value}`);

    // Update the CSS variable on the document
    document.documentElement.style.setProperty(name, value);

    // Update the store state
    set((state) => ({
      variables: state.variables.map((v) =>
        v.name === name ? { ...v, value } : v
      ),
      contextualVariables: state.contextualVariables.map((v) =>
        v.name === name ? { ...v, value } : v
      ),
    }));
  },

  resetVariable: (name) => {
    const state = get();
    const originalValue = state.originalValues[name];

    if (originalValue !== undefined) {
      console.log(`[Dials] Resetting ${name} to: ${originalValue}`);

      // Reset the CSS variable on the document
      document.documentElement.style.setProperty(name, originalValue);

      // Update the store state
      set((state) => ({
        variables: state.variables.map((v) =>
          v.name === name ? { ...v, value: originalValue } : v
        ),
        contextualVariables: state.contextualVariables.map((v) =>
          v.name === name ? { ...v, value: originalValue } : v
        ),
      }));
    }
  },

  resetAllVariables: () => {
    console.log(`[Dials] Resetting all variables`);

    // Reset all CSS variables on the document and update store
    set((state) => ({
      variables: state.variables.map((v) => {
        const originalValue = state.originalValues[v.name];
        if (originalValue !== undefined) {
          document.documentElement.style.setProperty(v.name, originalValue);
          return { ...v, value: originalValue };
        }
        return v;
      }),
      contextualVariables: state.contextualVariables.map((v) => {
        const originalValue = state.originalValues[v.name];
        if (originalValue !== undefined) {
          document.documentElement.style.setProperty(v.name, originalValue);
          return { ...v, value: originalValue };
        }
        return v;
      }),
    }));
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
}));