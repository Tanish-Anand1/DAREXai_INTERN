import { create } from "zustand";

type UiState = {
  selectedOpportunityId?: string;
  setSelectedOpportunityId: (id?: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedOpportunityId: undefined,
  setSelectedOpportunityId: (id) => set({ selectedOpportunityId: id }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
