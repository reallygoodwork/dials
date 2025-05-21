import { create } from 'zustand';

export interface CSSVariable {
  name: string;
  value: string;
  mediaQuery?: string;
}

export interface DialsState {
  variables: CSSVariable[];
  activeMediaQuery: string | null;
  setVariables: (variables: CSSVariable[]) => void;
  setActiveMediaQuery: (query: string | null) => void;
  updateVariable: (name: string, value: string) => void;
}

export const useDialsStore = create<DialsState>((set) => ({
  variables: [],
  activeMediaQuery: null,
  setVariables: (variables) => set({ variables }),
  setActiveMediaQuery: (query) => set({ activeMediaQuery: query }),
  updateVariable: (name, value) =>
    set((state) => ({
      variables: state.variables.map((v) =>
        v.name === name ? { ...v, value } : v
      ),
    })),
}));