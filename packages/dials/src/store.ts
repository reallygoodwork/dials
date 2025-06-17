import { create } from 'zustand';
import { ContextualCSSVariable, CSSVariableContext, getActiveContextForVariable } from './utils';

export interface CSSVariable {
  name: string;
  value: string;
  mediaQuery?: string;
}

export interface DialsState {
  variables: CSSVariable[];
  contextualVariables: ContextualCSSVariable[];
  originalValues: { [name: string]: string };
  userChanges: { [name: string]: string }; // Track user-made changes
  contextualUserChanges: { [variableName: string]: { [contextKey: string]: string } }; // Track changes per context
  activeMediaQuery: string | null;
  showContextualView: boolean;
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
}

export const useDialsStore = create<DialsState>((set, get) => ({
  variables: [],
  contextualVariables: [],
  originalValues: {},
  userChanges: {},
  contextualUserChanges: {},
  activeMediaQuery: null,
  showContextualView: false,

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

    // Update the CSS variable on the document
    document.documentElement.style.setProperty(name, value);

    // Update the store state
    set((state) => ({
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

      // Remove from user changes
      const newUserChanges = { ...state.userChanges };
      delete newUserChanges[name];

      const newContextualUserChanges = { ...state.contextualUserChanges };
      delete newContextualUserChanges[name];

      set({
        userChanges: newUserChanges,
        contextualUserChanges: newContextualUserChanges
      });

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

    // Clear all user changes
    set({ userChanges: {}, contextualUserChanges: {} });

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

  isUserChanged: (variableName) => {
    const state = get();
    return variableName in state.userChanges || variableName in state.contextualUserChanges;
  },

  getCurrentActiveContext: (variable) => {
    return getActiveContextForVariable(variable);
  },
}));