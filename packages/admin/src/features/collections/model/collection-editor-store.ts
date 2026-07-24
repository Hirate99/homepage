'use client';

import type {
  AdminCollectionImage,
  AdminCollectionRecord,
  LocationDraft,
  PlaceAutocompleteSuggestion,
} from '@homepage/home-data';
import { create } from 'zustand';

export type CollectionImage = AdminCollectionImage;
export type CollectionRecord = AdminCollectionRecord;
export type LocationSuggestion = PlaceAutocompleteSuggestion;
export type LocationFields = Omit<LocationDraft, 'source'>;

export interface PreviewItem {
  id: string;
  file: File;
  url: string;
}

export type EditorMode = 'create' | 'edit';
export type TaskStatus = 'idle' | 'pending';
export type EditorTask =
  | 'loadCollections'
  | 'scanLocation'
  | 'publish'
  | 'delete'
  | 'uploadImages'
  | 'searchLocation'
  | 'applyLocation';

interface EditorDraft {
  title: string;
  content: string;
  sortOrder: string;
  location: LocationFields;
  previews: PreviewItem[];
  coverIndex: number;
  editingCoverImageId: number | null;
}

interface LocationSearchState {
  query: string;
  suggestions: LocationSuggestion[];
  hasSearched: boolean;
}

interface EditorTasks {
  loadCollections: TaskStatus;
  scanLocation: TaskStatus;
  publish: TaskStatus;
  delete: TaskStatus;
  uploadImages: TaskStatus;
  searchLocation: TaskStatus;
  applyLocation: TaskStatus;
}

interface EditorUiState {
  status: string;
  currentPage: number;
  isDeletePostDialogOpen: boolean;
  imagePendingDelete: CollectionImage | null;
}

type StateUpdater<T> = T | ((current: T) => T);

export interface CollectionEditorActions {
  setCollections: (collections: CollectionRecord[]) => void;
  patchDraft: (patch: Partial<EditorDraft>) => void;
  updateLocation: (updater: StateUpdater<LocationFields>) => void;
  setPreviews: (updater: StateUpdater<PreviewItem[]>) => void;
  setCoverIndex: (updater: StateUpdater<number>) => void;
  patchLocationSearch: (patch: Partial<LocationSearchState>) => void;
  setTask: (task: EditorTask, status: TaskStatus) => void;
  setStatus: (status: string) => void;
  patchUi: (patch: Partial<EditorUiState>) => void;
  setCurrentPage: (updater: StateUpdater<number>) => void;
  resetForCreate: () => void;
  loadCollection: (collection: CollectionRecord, currentPage: number) => void;
}

export interface CollectionEditorState {
  mode: EditorMode;
  collections: CollectionRecord[];
  selectedCollectionId: number | null;
  draft: EditorDraft;
  locationSearch: LocationSearchState;
  tasks: EditorTasks;
  ui: EditorUiState;
  actions: CollectionEditorActions;
}

export const EMPTY_LOCATION: LocationFields = {
  latitude: null,
  longitude: null,
  locationName: '',
  country: '',
  region: '',
  description: '',
};

const initialDraft: EditorDraft = {
  title: '',
  content: '',
  sortOrder: '',
  location: EMPTY_LOCATION,
  previews: [],
  coverIndex: 0,
  editingCoverImageId: null,
};

const initialLocationSearch: LocationSearchState = {
  query: '',
  suggestions: [],
  hasSearched: false,
};

const initialTasks: EditorTasks = {
  loadCollections: 'pending',
  scanLocation: 'idle',
  publish: 'idle',
  delete: 'idle',
  uploadImages: 'idle',
  searchLocation: 'idle',
  applyLocation: 'idle',
};

const initialUi: EditorUiState = {
  status: '选择图片开始。',
  currentPage: 1,
  isDeletePostDialogOpen: false,
  imagePendingDelete: null,
};

function resolveUpdater<T>(updater: StateUpdater<T>, current: T) {
  return typeof updater === 'function'
    ? (updater as (value: T) => T)(current)
    : updater;
}

export const useCollectionEditorStore = create<CollectionEditorState>()(
  (set) => ({
    mode: 'create',
    collections: [],
    selectedCollectionId: null,
    draft: initialDraft,
    locationSearch: initialLocationSearch,
    tasks: initialTasks,
    ui: initialUi,
    actions: {
      setCollections: (collections) => set({ collections }),
      patchDraft: (patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            ...patch,
          },
        })),
      updateLocation: (updater) =>
        set((state) => ({
          draft: {
            ...state.draft,
            location: resolveUpdater(updater, state.draft.location),
          },
        })),
      setPreviews: (updater) =>
        set((state) => ({
          draft: {
            ...state.draft,
            previews: resolveUpdater(updater, state.draft.previews),
          },
        })),
      setCoverIndex: (updater) =>
        set((state) => ({
          draft: {
            ...state.draft,
            coverIndex: resolveUpdater(updater, state.draft.coverIndex),
          },
        })),
      patchLocationSearch: (patch) =>
        set((state) => ({
          locationSearch: {
            ...state.locationSearch,
            ...patch,
          },
        })),
      setTask: (task, status) =>
        set((state) => ({
          tasks: {
            ...state.tasks,
            [task]: status,
          },
        })),
      setStatus: (status) =>
        set((state) => ({
          ui: {
            ...state.ui,
            status,
          },
        })),
      patchUi: (patch) =>
        set((state) => ({
          ui: {
            ...state.ui,
            ...patch,
          },
        })),
      setCurrentPage: (updater) =>
        set((state) => ({
          ui: {
            ...state.ui,
            currentPage: resolveUpdater(updater, state.ui.currentPage),
          },
        })),
      resetForCreate: () =>
        set((state) => ({
          mode: 'create',
          selectedCollectionId: null,
          draft: initialDraft,
          locationSearch: initialLocationSearch,
          ui: {
            ...state.ui,
            ...initialUi,
          },
        })),
      loadCollection: (collection, currentPage) =>
        set((state) => ({
          mode: 'edit',
          selectedCollectionId: collection.id,
          draft: {
            title: collection.title,
            content: collection.content ?? '',
            sortOrder:
              collection.sortOrder === null ? '' : String(collection.sortOrder),
            location: {
              latitude: collection.latitude,
              longitude: collection.longitude,
              locationName: collection.locationName ?? '',
              country: collection.country ?? '',
              region: collection.region ?? '',
              description: collection.description ?? '',
            },
            previews: [],
            coverIndex: 0,
            editingCoverImageId: collection.coverImageId,
          },
          locationSearch: initialLocationSearch,
          ui: {
            ...state.ui,
            status: `Editing #${collection.id}.`,
            currentPage,
            imagePendingDelete: null,
          },
        })),
    },
  }),
);
