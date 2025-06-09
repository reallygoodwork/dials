import { create } from 'zustand';

export interface CSSVariable {
  name: string;
  value: string;
  mediaQuery?: string;
}

export interface DialsState {
  variables: CSSVariable[];
  originalValues: { [name: string]: string };
  activeMediaQuery: string | null;
  setVariables: (variables: CSSVariable[]) => void;
  setOriginalValues: (values: { [name: string]: string }) => void;
  setActiveMediaQuery: (query: string | null) => void;
  updateVariable: (name: string, value: string) => void;
  resetVariable: (name: string) => void;
  resetAllVariables: () => void;
}

export const useDialsStore = create<DialsState>((set, get) => ({
  variables: [],
  originalValues: {},
  activeMediaQuery: null,

  setVariables: (variables) => set({ variables }),
  setOriginalValues: (values) => set({ originalValues: values }),
  setActiveMediaQuery: (query) => set({ activeMediaQuery: query }),

  updateVariable: (name, value) => {
    console.log(`[Dials] Updating ${name} to: ${value}`);

    // Update the CSS variable on the document
    document.documentElement.style.setProperty(name, value);

    // Update the store state
    set((state) => ({
      variables: state.variables.map((v) =>
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
    }));
  },
}));