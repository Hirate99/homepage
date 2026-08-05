'use client';

import {
  ChangeEvent,
  FormEvent,
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  FileImage,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  type CollectionRecord,
  type LocationFields,
  type LocationSuggestion,
  type PreviewItem,
  useCollectionEditorStore,
} from '@/features/collections/model/collection-editor-store';

const PAGE_SIZE = 8;
const PREVIEW_MAX_EDGE = 720;

const inputClassName =
  'w-full rounded-2xl border border-orange-950/10 bg-white px-4 py-3 text-[--orange-9] shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-orange-950/35 focus:border-orange-500/55 focus:ring-4 focus:ring-orange-300/20';

const mutedInputClassName =
  'w-full rounded-2xl border border-orange-950/10 bg-orange-50/55 px-4 py-3 text-[--orange-9] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-orange-950/35 focus:border-orange-500/55 focus:bg-white focus:ring-4 focus:ring-orange-300/20';

async function createPreviewItem(file: File): Promise<PreviewItem> {
  const id = `${file.name}-${file.lastModified}-${crypto.randomUUID()}`;

  if (typeof createImageBitmap !== 'function') {
    return { id, file, url: URL.createObjectURL(file) };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      PREVIEW_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');

    if (!context) {
      bitmap.close();
      return { id, file, url: URL.createObjectURL(file) };
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const thumbnail = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.82);
    });

    return {
      id,
      file,
      url: URL.createObjectURL(thumbnail ?? file),
    };
  } catch {
    return { id, file, url: URL.createObjectURL(file) };
  }
}

function moveItem<T extends { id: string | number }>(
  items: T[],
  itemId: T['id'],
  targetIndex: number,
) {
  const currentIndex = items.findIndex((item) => item.id === itemId);
  if (
    currentIndex === -1 ||
    targetIndex < 0 ||
    targetIndex >= items.length ||
    currentIndex === targetIndex
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function formatUpdatedAt(value: string) {
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.toLowerCase().includes('application/json')) {
    try {
      return (await response.json()) as T;
    } catch {
      throw new Error(
        'The admin service returned an invalid response. Refresh and try again.',
      );
    }
  }

  // Consume the response so the connection can be reused, but do not surface
  // proxy pages or server internals in the editor.
  await response.text();
  throw new Error(
    response.ok
      ? 'The admin service returned an invalid response. Refresh and try again.'
      : `The admin service is unavailable (${response.status}). Refresh and try again.`,
  );
}

export function UploadPortal() {
  const mode = useCollectionEditorStore((state) => state.mode);
  const collections = useCollectionEditorStore((state) => state.collections);
  const selectedCollectionId = useCollectionEditorStore(
    (state) => state.selectedCollectionId,
  );
  const draft = useCollectionEditorStore((state) => state.draft);
  const locationSearch = useCollectionEditorStore(
    (state) => state.locationSearch,
  );
  const tasks = useCollectionEditorStore((state) => state.tasks);
  const ui = useCollectionEditorStore((state) => state.ui);
  const {
    setCollections,
    patchDraft,
    updateLocation,
    setPreviews,
    setCoverPreviewId,
    setEditingImages,
    patchLocationSearch,
    setTask,
    setStatus,
    patchUi,
    setCurrentPage,
    resetForCreate: resetEditorForCreate,
    loadCollection,
  } = useCollectionEditorStore((state) => state.actions);
  const {
    title,
    content,
    sortOrder,
    previews,
    coverPreviewId,
    editingImages,
    location,
    editingCoverImageId,
  } = draft;
  const {
    query: locationQuery,
    suggestions: locationSuggestions,
    hasSearched: hasSearchedLocation,
  } = locationSearch;
  const { status, currentPage, isDeletePostDialogOpen, imagePendingDelete } =
    ui;
  const isScanningLocation = tasks.scanLocation === 'pending';
  const isPublishing = tasks.publish === 'pending';
  const isLoadingCollections = tasks.loadCollections === 'pending';
  const isDeleting = tasks.delete === 'pending';
  const isUploadingImages = tasks.uploadImages === 'pending';
  const isPreparingImages = tasks.prepareImages === 'pending';
  const isSearchingLocation = tasks.searchLocation === 'pending';
  const isApplyingLocation = tasks.applyLocation === 'pending';
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipNextLocationLookupRef = useRef(false);
  const draggedItemIdRef = useRef<string | number | null>(null);
  const previewsRef = useRef(previews);
  const [collectionQuery, setCollectionQuery] = useState('');

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(
    () => () => {
      previewsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [],
  );

  useEffect(() => {
    const normalizedQuery = locationQuery.trim();

    if (skipNextLocationLookupRef.current) {
      skipNextLocationLookupRef.current = false;
      return;
    }

    if (normalizedQuery.length < 2) {
      patchLocationSearch({
        suggestions: [],
        hasSearched: false,
      });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchLocationSuggestions(normalizedQuery, false);
    }, 220);

    return () => window.clearTimeout(timeoutId);
    // fetchLocationSuggestions only reads stable store actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationQuery, patchLocationSearch]);

  async function refreshCollections(nextSelectedId?: number | null) {
    setTask('loadCollections', 'pending');

    try {
      const response = await fetch('/api/posts');
      const data = await readApiResponse<{
        collections?: CollectionRecord[];
        error?: string;
      }>(response);

      if (!response.ok || !data.collections) {
        throw new Error(data.error ?? 'Failed to load posts.');
      }

      const nextCollections = data.collections;
      setCollections(nextCollections);

      const targetId =
        typeof nextSelectedId === 'number'
          ? nextSelectedId
          : selectedCollectionId;

      if (!targetId) {
        setCurrentPage((page) =>
          Math.min(
            page,
            Math.max(1, Math.ceil(nextCollections.length / PAGE_SIZE)),
          ),
        );
        return;
      }

      const match = nextCollections.find((item) => item.id === targetId);
      if (match) {
        loadCollectionIntoForm(match, nextCollections);
      } else {
        resetForCreate();
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Could not load collections. Refresh and try again.',
      );
    } finally {
      setTask('loadCollections', 'idle');
    }
  }

  useEffect(() => {
    void refreshCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPageForCollection(
    allCollections: CollectionRecord[],
    collectionId: number | null,
  ) {
    if (!collectionId) {
      return 1;
    }

    const index = allCollections.findIndex((item) => item.id === collectionId);
    if (index === -1) {
      return 1;
    }

    return Math.floor(index / PAGE_SIZE) + 1;
  }

  function resetPreviews() {
    setPreviews((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
  }

  function resetForCreate() {
    resetPreviews();
    startTransition(() => {
      resetEditorForCreate();
      formRef.current?.reset();
    });
  }

  function loadCollectionIntoForm(
    collection: CollectionRecord,
    availableCollections = collections,
  ) {
    resetPreviews();
    startTransition(() => {
      loadCollection(
        collection,
        getPageForCollection(availableCollections, collection.id),
      );
      formRef.current?.reset();
    });
  }

  function confirmDiscardChanges() {
    return (
      !hasUnsavedChanges ||
      window.confirm('Discard the changes in the current collection?')
    );
  }

  function revealEditorOnNarrowScreen() {
    if (!window.matchMedia('(max-width: 1023px)').matches) {
      return;
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }

  function startNewCollection() {
    if (!confirmDiscardChanges()) {
      return;
    }
    resetForCreate();
    revealEditorOnNarrowScreen();
  }

  function selectCollection(collection: CollectionRecord) {
    if (collection.id === selectedCollectionId) {
      revealEditorOnNarrowScreen();
      return;
    }
    if (!confirmDiscardChanges()) {
      return;
    }
    loadCollectionIntoForm(collection);
    revealEditorOnNarrowScreen();
  }

  async function readLocationHint(files: File[]) {
    if (!files.length) {
      return;
    }

    const payload = new FormData();
    files.forEach((file) => payload.append('images', file));

    setTask('scanLocation', 'pending');
    setStatus('Reading EXIF data and looking up the location…');

    try {
      const response = await fetch('/api/location-hint', {
        method: 'POST',
        body: payload,
      });
      const data = await readApiResponse<{
        hint?: LocationFields | null;
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? 'Location lookup failed.');
      }

      if (!data.hint) {
        setStatus('No GPS metadata found.');
        return;
      }

      updateLocation((current) => ({
        ...current,
        ...data.hint,
        description: current.description,
      }));
      setStatus('Location fields updated from image metadata.');
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Location lookup failed.',
      );
    } finally {
      setTask('scanLocation', 'idle');
    }
  }

  async function fetchLocationSuggestions(
    queryText: string,
    announce: boolean,
  ) {
    const normalizedQuery = queryText.trim();
    if (normalizedQuery.length < 2) {
      patchLocationSearch({
        suggestions: [],
        hasSearched: false,
      });
      return;
    }

    setTask('searchLocation', 'pending');
    if (announce) {
      setStatus(`Looking up “${normalizedQuery}”…`);
    }

    try {
      const response = await fetch('/api/location-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: normalizedQuery }),
      });
      const data = await readApiResponse<{
        suggestions?: LocationSuggestion[];
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? 'Location search failed.');
      }

      const suggestions = data.suggestions ?? [];
      patchLocationSearch({
        suggestions,
        hasSearched: true,
      });

      if (announce) {
        setStatus(
          suggestions.length > 0
            ? 'Choose a place from the list.'
            : 'No matches found.',
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Location search failed.';

      patchLocationSearch({
        suggestions: [],
        hasSearched: false,
      });
      if (announce) {
        setStatus(message);
      }
    } finally {
      setTask('searchLocation', 'idle');
    }
  }

  async function handleLocationSearch() {
    if (!locationQuery.trim()) {
      patchLocationSearch({
        suggestions: [],
        hasSearched: false,
      });
      setStatus('Enter a place to search.');
      return;
    }

    await fetchLocationSuggestions(locationQuery, true);
  }

  async function handleLocationSelect(suggestion: LocationSuggestion) {
    setTask('applyLocation', 'pending');
    setStatus(`Using “${suggestion.text}”…`);

    try {
      const response = await fetch('/api/location-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ placeId: suggestion.placeId }),
      });
      const data = await readApiResponse<{
        hint?: LocationFields | null;
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? 'Place lookup failed.');
      }

      if (!data.hint) {
        setStatus('No place details found.');
        return;
      }

      skipNextLocationLookupRef.current = true;
      patchLocationSearch({
        query: suggestion.text,
        suggestions: [],
        hasSearched: false,
      });
      updateLocation((current) => ({
        ...current,
        ...data.hint,
        description: current.description,
      }));
      setStatus('Location fields updated from place selection.');
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Place lookup failed.',
      );
    } finally {
      setTask('applyLocation', 'idle');
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!files.length) {
      if (mode !== 'edit') {
        setStatus('Choose images or select a collection to begin.');
      }
      return;
    }

    setTask('prepareImages', 'pending');
    setStatus(`Preparing ${files.length} preview(s)…`);
    const nextItems: PreviewItem[] = [];
    for (const file of files) {
      nextItems.push(await createPreviewItem(file));
    }
    setTask('prepareImages', 'idle');
    setPreviews((current) => [...current, ...nextItems]);

    if (mode !== 'edit' && !coverPreviewId) {
      setCoverPreviewId(nextItems[0]?.id ?? null);
    }

    if (mode === 'edit') {
      setStatus(
        files.length > 0
          ? `${files.length} image(s) ready to append.`
          : 'No new images selected.',
      );
      return;
    }

    setStatus(
      `${files.length} image(s) added. Drag or use the arrow buttons to reorder.`,
    );
  }

  function removePreview(previewId: string) {
    setPreviews((current) => {
      if (!current.some((item) => item.id === previewId)) {
        return current;
      }

      const target = current.find((item) => item.id === previewId);
      if (!target) {
        return current;
      }
      URL.revokeObjectURL(target.url);

      const next = current.filter((item) => item.id !== previewId);
      setCoverPreviewId((selected) =>
        selected === previewId ? (next[0]?.id ?? null) : selected,
      );
      return next;
    });

    setStatus('Image removed from draft.');
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = previews.map((item) => item.file);
    if (!files.length) {
      setStatus('Upload at least one image.');
      return;
    }

    const payload = new FormData();
    payload.set('title', title);
    payload.set('content', content);
    payload.set('sortOrder', sortOrder);
    const coverIndex = Math.max(
      0,
      previews.findIndex((item) => item.id === coverPreviewId),
    );
    payload.set('coverIndex', String(coverIndex));
    payload.set(
      'latitude',
      location.latitude === null ? '' : String(location.latitude),
    );
    payload.set(
      'longitude',
      location.longitude === null ? '' : String(location.longitude),
    );
    payload.set('locationName', location.locationName);
    payload.set('country', location.country);
    payload.set('region', location.region);
    payload.set('description', location.description);
    files.forEach((file) => payload.append('images', file));

    setTask('publish', 'pending');
    setStatus('Uploading originals and publishing…');

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: payload,
      });
      const data = await readApiResponse<{
        result?: { collectionId: number; uploadedCount: number };
        error?: string;
      }>(response);

      if (!response.ok || !data.result) {
        throw new Error(data.error ?? 'Publish failed.');
      }

      setStatus(
        `Published #${data.result.collectionId} with ${data.result.uploadedCount} image(s).`,
      );
      await refreshCollections(data.result.collectionId);
      resetForCreate();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Publish failed.');
    } finally {
      setTask('publish', 'idle');
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCollectionId) {
      return;
    }

    setTask('publish', 'pending');
    setStatus('Saving changes…');

    try {
      const response = await fetch(`/api/posts/${selectedCollectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          sortOrder: sortOrder ? Number(sortOrder) : null,
          coverImageId: editingCoverImageId,
          imageOrder: editingImages.map((image) => image.id),
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: location.locationName,
          country: location.country,
          region: location.region,
          description: location.description,
        }),
      });
      const data = await readApiResponse<{
        collection?: CollectionRecord;
        error?: string;
      }>(response);

      if (!response.ok || !data.collection) {
        throw new Error(data.error ?? 'Update failed.');
      }

      setStatus(`Saved #${data.collection.id}.`);
      await refreshCollections(data.collection.id);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Update failed.');
    } finally {
      setTask('publish', 'idle');
    }
  }

  async function handleDeleteCollection() {
    if (!selectedCollectionId) {
      return;
    }

    setTask('delete', 'pending');
    setStatus('Deleting collection…');

    try {
      const response = await fetch(`/api/posts/${selectedCollectionId}`, {
        method: 'DELETE',
      });
      const data = await readApiResponse<{
        ok?: boolean;
        error?: string;
      }>(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'Delete failed.');
      }

      patchUi({ isDeletePostDialogOpen: false });
      resetForCreate();
      setStatus('Collection deleted.');
      await refreshCollections(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setTask('delete', 'idle');
    }
  }

  async function handleAppendImages() {
    if (!selectedCollectionId) {
      return;
    }

    const files = previews.map((item) => item.file);
    if (!files.length) {
      setStatus('Choose images to append first.');
      return;
    }

    const payload = new FormData();
    files.forEach((file) => payload.append('images', file));

    setTask('uploadImages', 'pending');
    setStatus(`Uploading ${files.length} new image(s)…`);

    try {
      const response = await fetch(
        `/api/posts/${selectedCollectionId}/images`,
        {
          method: 'POST',
          body: payload,
        },
      );
      const data = await readApiResponse<{
        collection?: CollectionRecord;
        error?: string;
      }>(response);

      if (!response.ok || !data.collection) {
        throw new Error(data.error ?? 'Image upload failed.');
      }

      loadCollectionIntoForm(data.collection);
      await refreshCollections(data.collection.id);
      setStatus(`Added ${files.length} image(s) to #${data.collection.id}.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Image upload failed.',
      );
    } finally {
      setTask('uploadImages', 'idle');
      resetPreviews();
      formRef.current?.reset();
    }
  }

  async function handleDeleteImage() {
    if (!selectedCollectionId || !imagePendingDelete) {
      return;
    }

    setTask('delete', 'pending');
    setStatus(`Deleting image #${imagePendingDelete.id}…`);

    try {
      const response = await fetch(
        `/api/posts/${selectedCollectionId}/images/${imagePendingDelete.id}`,
        {
          method: 'DELETE',
        },
      );
      const data = await readApiResponse<{
        collection?: CollectionRecord;
        error?: string;
      }>(response);

      if (!response.ok || !data.collection) {
        throw new Error(data.error ?? 'Image delete failed.');
      }

      loadCollectionIntoForm(data.collection);
      await refreshCollections(data.collection.id);
      patchUi({ imagePendingDelete: null });
      setStatus(`Deleted image #${imagePendingDelete.id}.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Image delete failed.',
      );
    } finally {
      setTask('delete', 'idle');
    }
  }

  function movePreview(previewId: string, direction: -1 | 1) {
    setPreviews((current) => {
      const index = current.findIndex((item) => item.id === previewId);
      return moveItem(current, previewId, index + direction);
    });
    setStatus('Image order changed.');
  }

  function moveEditingImage(imageId: number, direction: -1 | 1) {
    setEditingImages((current) => {
      const index = current.findIndex((item) => item.id === imageId);
      return moveItem(current, imageId, index + direction);
    });
    setStatus('Image order changed. Save changes to publish it.');
  }

  function dropPreview(targetId: string) {
    const draggedItemId = draggedItemIdRef.current;
    if (
      typeof draggedItemId !== 'string' ||
      !draggedItemId.startsWith('preview:')
    ) {
      return;
    }

    const previewId = draggedItemId.slice('preview:'.length);
    setPreviews((current) => {
      const targetIndex = current.findIndex((item) => item.id === targetId);
      return moveItem(current, previewId, targetIndex);
    });
    draggedItemIdRef.current = null;
    setStatus('Image order changed.');
  }

  function dropEditingImage(targetId: number) {
    const draggedItemId = draggedItemIdRef.current;
    if (
      typeof draggedItemId !== 'string' ||
      !draggedItemId.startsWith('saved:')
    ) {
      return;
    }

    const imageId = Number(draggedItemId.slice('saved:'.length));
    setEditingImages((current) => {
      const targetIndex = current.findIndex((item) => item.id === targetId);
      return moveItem(current, imageId, targetIndex);
    });
    draggedItemIdRef.current = null;
    setStatus('Image order changed. Save changes to publish it.');
  }

  const selectedCollection = collections.find(
    (item) => item.id === selectedCollectionId,
  );
  const normalizedCollectionQuery = collectionQuery.trim().toLocaleLowerCase();
  const filteredCollections = normalizedCollectionQuery
    ? collections.filter((collection) =>
        [
          collection.title,
          collection.locationName,
          collection.country,
          collection.region,
          String(collection.id),
        ].some((value) =>
          String(value ?? '')
            .toLocaleLowerCase()
            .includes(normalizedCollectionQuery),
        ),
      )
    : collections;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCollections.length / PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageCollections = filteredCollections.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );
  const hasLocationDraft = Boolean(
    location.locationName.trim() ||
      location.country.trim() ||
      location.region.trim() ||
      location.description.trim() ||
      location.latitude !== null ||
      location.longitude !== null,
  );
  const hasUnsavedChanges =
    mode === 'create'
      ? Boolean(
          title.trim() ||
            content.trim() ||
            sortOrder ||
            previews.length ||
            hasLocationDraft,
        )
      : Boolean(
          selectedCollection &&
            (title !== selectedCollection.title ||
              content !== (selectedCollection.content ?? '') ||
              sortOrder !==
                (selectedCollection.sortOrder === null
                  ? ''
                  : String(selectedCollection.sortOrder)) ||
              editingCoverImageId !== selectedCollection.coverImageId ||
              editingImages.map((image) => image.id).join(',') !==
                selectedCollection.images.map((image) => image.id).join(',') ||
              location.latitude !== selectedCollection.latitude ||
              location.longitude !== selectedCollection.longitude ||
              location.locationName !==
                (selectedCollection.locationName ?? '') ||
              location.country !== (selectedCollection.country ?? '') ||
              location.region !== (selectedCollection.region ?? '') ||
              location.description !== (selectedCollection.description ?? '') ||
              previews.length > 0),
        );
  const isBusy =
    isScanningLocation ||
    isPublishing ||
    isDeleting ||
    isUploadingImages ||
    isPreparingImages ||
    isApplyingLocation;
  const isLocationLookupBusy = isSearchingLocation || isApplyingLocation;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-hidden bg-[#f7f4ee] px-4 pb-10 pt-5 sm:px-6 lg:px-8"
    >
      <a
        href="#collection-editor"
        className="sr-only z-50 rounded-full bg-[--orange-9] px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to editor
      </a>
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-5 border-b border-orange-950/10 pb-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[--orange-7]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Private Workspace
            </p>
            <h1 className="font-display mt-2 text-4xl font-medium leading-none text-[--orange-9] sm:text-5xl">
              Collection Studio
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[--orange-8]">
              Find a collection, update its story and images, then publish when
              everything is ready.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="subtle"
              size="icon"
              aria-label="Refresh collections"
              onClick={() => void refreshCollections(selectedCollectionId)}
              disabled={isLoadingCollections}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingCollections ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </Button>
            <Button onClick={startNewCollection}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Collection
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="self-start rounded-3xl border border-orange-950/10 bg-white p-4 shadow-sm lg:sticky lg:top-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[--orange-7]">
                  Library
                </p>
                <h2 className="font-display mt-1 text-2xl text-[--orange-9]">
                  Collections
                </h2>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-sm tabular-nums text-[--orange-8]">
                {isLoadingCollections ? '…' : collections.length}
              </span>
            </div>

            <label className="relative mt-4 block">
              <span className="sr-only">Search collections</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--orange-7]"
                aria-hidden="true"
              />
              <input
                type="search"
                name="collection-search"
                autoComplete="off"
                placeholder="Search title or place…"
                value={collectionQuery}
                onChange={(event) => {
                  setCollectionQuery(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-50/60 py-3 pl-10 pr-10 text-sm text-[--orange-9] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-orange-950/35 focus:border-orange-500/50 focus:bg-white focus:ring-4 focus:ring-orange-300/20"
              />
              {collectionQuery ? (
                <button
                  type="button"
                  aria-label="Clear collection search"
                  onClick={() => {
                    setCollectionQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[--orange-7] transition-colors hover:bg-white hover:text-[--orange-9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-18rem)]">
              {filteredCollections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-500/20 bg-orange-50/60 p-5 text-sm leading-6 text-[--orange-8]">
                  {collections.length === 0
                    ? 'No collections yet. Create the first one when you are ready.'
                    : `No collections match “${collectionQuery.trim()}”.`}
                </div>
              ) : (
                pageCollections.map((collection) => {
                  const active = collection.id === selectedCollectionId;
                  const cover =
                    collection.images.find(
                      (image) => image.id === collection.coverImageId,
                    ) ?? collection.images[0];

                  return (
                    <button
                      key={collection.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectCollection(collection)}
                      className={`flex w-full items-center overflow-hidden rounded-2xl border text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 ${
                        active
                          ? 'border-orange-500/45 bg-orange-50 shadow-[0_8px_22px_rgba(95,44,15,0.08)]'
                          : 'border-orange-500/10 bg-white hover:border-orange-500/25 hover:bg-orange-50/50'
                      }`}
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.src}
                          alt={collection.title}
                          width={96}
                          height={80}
                          loading="lazy"
                          decoding="async"
                          className="h-20 w-24 shrink-0 object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-1 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-sans text-sm font-semibold text-[--orange-9]">
                            {collection.title || `#${collection.id}`}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-[--orange-7]">
                            {collection.images.length} photos
                          </span>
                        </div>
                        <p className="text-xs text-[--orange-8]">
                          {formatUpdatedAt(collection.updatedAt)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {filteredCollections.length > PAGE_SIZE ? (
              <Pagination className="mt-4 border-t border-orange-500/10 pt-4">
                <PaginationContent>
                  <PaginationPrevious
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={safeCurrentPage === 1}
                  />
                  <span className="text-xs tabular-nums text-[--orange-7]">
                    {safeCurrentPage} / {totalPages}
                  </span>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={safeCurrentPage === totalPages}
                  />
                </PaginationContent>
              </Pagination>
            ) : null}
          </aside>

          <form
            id="collection-editor"
            ref={formRef}
            onSubmit={mode === 'create' ? handleCreate : handleUpdate}
            aria-label={
              mode === 'create' ? 'Create collection' : 'Edit collection'
            }
            className="scroll-mt-4 rounded-3xl border border-orange-950/10 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="mb-7 flex flex-wrap items-start justify-between gap-5 border-b border-orange-950/10 pb-6">
              <div className="min-w-0">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[--orange-7]">
                  {mode === 'create'
                    ? 'Create Collection'
                    : `Editing Collection #${selectedCollection?.id ?? ''}`}
                </p>
                <h2 className="font-display mt-2 truncate text-3xl text-[--orange-9] sm:text-4xl">
                  {mode === 'create'
                    ? 'Untitled Collection'
                    : selectedCollection
                      ? selectedCollection.title || `#${selectedCollection.id}`
                      : 'Select a Collection'}
                </h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-[--orange-8]">
                  {hasUnsavedChanges ? (
                    <>
                      <CircleAlert
                        className="h-4 w-4 text-amber-600"
                        aria-hidden="true"
                      />
                      Unsaved changes
                    </>
                  ) : (
                    <>
                      <Check
                        className="h-4 w-4 text-emerald-600"
                        aria-hidden="true"
                      />
                      Everything is up to date
                    </>
                  )}
                </p>
              </div>

              {mode === 'edit' ? (
                <Button
                  variant="destructive"
                  onClick={() => patchUi({ isDeletePostDialogOpen: true })}
                  disabled={isBusy}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete Collection
                </Button>
              ) : null}
            </div>

            <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-7">
                <section className="space-y-6 rounded-3xl border border-orange-950/10 bg-[#fffdfa] p-5 sm:p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[--orange-7]">
                      01 · Details
                    </p>
                    <h3 className="font-display mt-1 text-2xl text-[--orange-9]">
                      Tell the story
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[--orange-8]">
                      Give the collection a clear title and optional context.
                    </p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="md:col-span-2" htmlFor="collection-title">
                      <span className="mb-2 block font-sans text-sm font-semibold text-[--orange-9]">
                        Title
                      </span>
                      <input
                        id="collection-title"
                        name="title"
                        autoComplete="off"
                        placeholder="e.g. A quiet winter in Asahikawa…"
                        className={inputClassName}
                        value={title}
                        onChange={(event) =>
                          patchDraft({ title: event.target.value })
                        }
                        required
                      />
                    </label>

                    <label
                      className="md:col-span-2"
                      htmlFor="collection-content"
                    >
                      <span className="mb-2 block font-sans text-sm font-semibold text-[--orange-9]">
                        Content
                      </span>
                      <textarea
                        id="collection-content"
                        name="content"
                        autoComplete="off"
                        placeholder="Add a short note or leave this blank…"
                        className={`${inputClassName} min-h-28 resize-y leading-7`}
                        value={content}
                        onChange={(event) =>
                          patchDraft({ content: event.target.value })
                        }
                      />
                    </label>

                    <label htmlFor="collection-sort-order">
                      <span className="mb-2 block font-sans text-sm font-semibold text-[--orange-9]">
                        Sort Order
                      </span>
                      <input
                        id="collection-sort-order"
                        name="sort-order"
                        type="number"
                        inputMode="numeric"
                        placeholder="Optional…"
                        className={inputClassName}
                        value={sortOrder}
                        onChange={(event) =>
                          patchDraft({ sortOrder: event.target.value })
                        }
                      />
                      <span className="mt-2 block text-xs leading-5 text-[--orange-7]">
                        Lower numbers appear first. Leave blank for automatic
                        ordering.
                      </span>
                    </label>
                  </div>
                </section>

                <section className="space-y-5 rounded-3xl border border-orange-950/10 bg-orange-50/35 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[--orange-7]">
                        02 · Images
                      </p>
                      <h3 className="font-display mt-1 text-2xl text-[--orange-9]">
                        Build the sequence
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[--orange-8]">
                        Add photos, choose the cover, and arrange the final
                        order.
                      </p>
                    </div>
                    {mode === 'create' && previews.length > 0 ? (
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() =>
                          readLocationHint(previews.map((item) => item.file))
                        }
                        disabled={isScanningLocation || isBusy}
                      >
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        {isScanningLocation ? 'Reading EXIF…' : 'Read Location'}
                      </Button>
                    ) : null}
                  </div>

                  {mode === 'edit' && previews.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-500/15 bg-white p-4">
                      <p className="flex items-center gap-2 text-sm text-[--orange-8]">
                        <FileImage className="h-4 w-4" aria-hidden="true" />
                        {previews.length} new image(s) ready to add.
                      </p>
                      <Button
                        variant="secondary"
                        onClick={handleAppendImages}
                        disabled={isBusy}
                      >
                        {isUploadingImages ? 'Uploading…' : 'Add to Collection'}
                      </Button>
                    </div>
                  ) : null}

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="images"
                      accept="image/*"
                      multiple
                      tabIndex={-1}
                      aria-hidden="true"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                      className="mb-5 flex min-h-36 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-orange-500/30 bg-white px-6 py-8 text-center transition-[border-color,background-color,box-shadow] hover:border-orange-500/55 hover:bg-orange-50/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/25 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isPreparingImages ? (
                        <LoaderCircle
                          className="h-7 w-7 animate-spin text-[--orange-7]"
                          aria-hidden="true"
                        />
                      ) : (
                        <ImagePlus
                          className="h-7 w-7 text-[--orange-7]"
                          aria-hidden="true"
                        />
                      )}
                      <span className="mt-3 font-semibold text-[--orange-9]">
                        {isPreparingImages
                          ? 'Preparing previews…'
                          : mode === 'create'
                            ? 'Choose Photos'
                            : 'Add More Photos'}
                      </span>
                      <span className="mt-1 text-sm text-[--orange-8]">
                        Select multiple images at once · up to 20 MB each
                      </span>
                    </button>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {mode === 'create' ? (
                        previews.length === 0 ? (
                          <div className="rounded-3xl border border-dashed border-orange-500/20 bg-white/70 p-6 text-sm text-[--orange-8]">
                            Upload images to preview them here.
                          </div>
                        ) : (
                          previews.map((preview, index) => (
                            <div
                              key={preview.id}
                              draggable={!isBusy}
                              onDragStart={() => {
                                draggedItemIdRef.current = `preview:${preview.id}`;
                              }}
                              onDragEnd={() => {
                                draggedItemIdRef.current = null;
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => dropPreview(preview.id)}
                              className="group overflow-hidden rounded-2xl border border-orange-500/15 bg-white"
                            >
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={preview.url}
                                  alt={preview.file.name}
                                  width={720}
                                  height={540}
                                  loading="lazy"
                                  decoding="async"
                                  draggable={false}
                                  className="aspect-[4/3] w-full object-cover"
                                />
                                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[--orange-9] shadow-sm">
                                    <GripVertical
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                    {index + 1}
                                  </span>
                                  {coverPreviewId === preview.id ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[--orange-9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
                                      <Star
                                        className="h-3 w-3 fill-current"
                                        aria-hidden="true"
                                      />
                                      Cover
                                    </span>
                                  ) : null}
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(60,27,8,0.8)] via-[rgba(60,27,8,0.34)] to-transparent p-4">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant={
                                        coverPreviewId === preview.id
                                          ? 'secondary'
                                          : 'default'
                                      }
                                      size="sm"
                                      className={
                                        coverPreviewId === preview.id
                                          ? 'bg-white/92 min-w-0 flex-1 px-3'
                                          : 'min-w-0 flex-1 bg-white px-3 text-[--orange-9] hover:bg-white'
                                      }
                                      onClick={() =>
                                        setCoverPreviewId(preview.id)
                                      }
                                      disabled={isBusy}
                                    >
                                      <Star
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                      />
                                      {coverPreviewId === preview.id
                                        ? 'Cover'
                                        : 'Set Cover'}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="min-w-0 flex-1 bg-white/15 px-3 text-white backdrop-blur-sm hover:bg-red-500 hover:text-white"
                                      onClick={() => removePreview(preview.id)}
                                      disabled={isBusy}
                                    >
                                      <Trash2
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                      />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4">
                                <p className="truncate text-sm text-[--orange-8]">
                                  {preview.file.name}
                                </p>
                                <div className="mt-3 flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => movePreview(preview.id, -1)}
                                    disabled={isBusy || index === 0}
                                    className="flex-1"
                                  >
                                    <ArrowLeft
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                    Earlier
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => movePreview(preview.id, 1)}
                                    disabled={
                                      isBusy || index === previews.length - 1
                                    }
                                    className="flex-1"
                                  >
                                    Later
                                    <ArrowRight
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )
                      ) : editingImages.length ? (
                        editingImages.map((image, index) => (
                          <div
                            key={image.id}
                            draggable={!isBusy}
                            onDragStart={() => {
                              draggedItemIdRef.current = `saved:${image.id}`;
                            }}
                            onDragEnd={() => {
                              draggedItemIdRef.current = null;
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => dropEditingImage(image.id)}
                            className="group overflow-hidden rounded-2xl border border-orange-500/15 bg-white"
                          >
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image.src}
                                alt={selectedCollection?.title ?? title}
                                width={image.width ?? 720}
                                height={image.height ?? 540}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                                className="aspect-[4/3] w-full object-cover"
                              />
                              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[--orange-9] shadow-sm">
                                  <GripVertical
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  {index + 1}
                                </span>
                                {editingCoverImageId === image.id ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[--orange-9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
                                    <Star
                                      className="h-3 w-3 fill-current"
                                      aria-hidden="true"
                                    />
                                    Cover
                                  </span>
                                ) : null}
                              </div>
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(60,27,8,0.8)] via-[rgba(60,27,8,0.34)] to-transparent p-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant={
                                      editingCoverImageId === image.id
                                        ? 'secondary'
                                        : 'default'
                                    }
                                    size="sm"
                                    className={
                                      editingCoverImageId === image.id
                                        ? 'bg-white/92 min-w-0 flex-1 px-3'
                                        : 'min-w-0 flex-1 bg-white px-3 text-[--orange-9] hover:bg-white'
                                    }
                                    onClick={() =>
                                      patchDraft({
                                        editingCoverImageId: image.id,
                                      })
                                    }
                                    disabled={isBusy}
                                  >
                                    <Star
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                    {editingCoverImageId === image.id
                                      ? 'Cover'
                                      : 'Set Cover'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="min-w-0 flex-1 bg-white/15 px-3 text-white backdrop-blur-sm hover:bg-red-500 hover:text-white"
                                    onClick={() =>
                                      patchUi({ imagePendingDelete: image })
                                    }
                                    disabled={isBusy}
                                  >
                                    <Trash2
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveEditingImage(image.id, -1)}
                                disabled={isBusy || index === 0}
                                className="flex-1"
                              >
                                <ArrowLeft
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                Earlier
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveEditingImage(image.id, 1)}
                                disabled={
                                  isBusy || index === editingImages.length - 1
                                }
                                className="flex-1"
                              >
                                Later
                                <ArrowRight
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-3xl border border-dashed border-orange-500/20 bg-white/70 p-6 text-sm text-[--orange-8]">
                          This collection has no images.
                        </div>
                      )}
                    </div>

                    {mode === 'edit' && previews.length > 0 ? (
                      <div className="mt-4 border-t border-orange-500/10 pt-4">
                        <p className="mb-3 text-sm text-[--orange-8]">Queued</p>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {previews.map((preview, index) => (
                            <div
                              key={preview.id}
                              className="border-orange-500/12 overflow-hidden rounded-[24px] border bg-white shadow-[0_12px_30px_rgba(95,44,15,0.08)]"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={preview.url}
                                alt={preview.file.name}
                                width={720}
                                height={540}
                                loading="lazy"
                                decoding="async"
                                className="aspect-[4/3] w-full object-cover"
                              />
                              <div className="space-y-2 p-4">
                                <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[--orange-8]">
                                  New {index + 1}
                                </span>
                                <p className="truncate text-sm text-[--orange-8]">
                                  {preview.file.name}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                <details className="group rounded-3xl border border-orange-950/10 bg-[#fffdfa] p-5 sm:p-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-orange-300/25">
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[--orange-7]">
                        03 · Location
                      </span>
                      <span className="font-display mt-1 block text-2xl text-[--orange-9]">
                        Place this story
                      </span>
                    </span>
                    <span className="max-w-[45%] truncate text-sm text-[--orange-7]">
                      {location.locationName ||
                        location.country ||
                        'Optional details'}
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-[--orange-8]">
                    Search for a place or enter the details manually. Photo EXIF
                    can prefill coordinates before publishing.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-orange-950/10 bg-orange-50/45 p-4 sm:col-span-2 lg:col-span-3">
                      <label
                        className="mb-2 block text-sm font-semibold text-[--orange-9]"
                        htmlFor="location-search"
                      >
                        Find a place
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                          <Search
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--orange-7]"
                            aria-hidden="true"
                          />
                          <input
                            id="location-search"
                            name="location-search"
                            autoComplete="off"
                            className={`${inputClassName} pl-10`}
                            placeholder="Search for a city or landmark…"
                            value={locationQuery}
                            onChange={(event) =>
                              patchLocationSearch({ query: event.target.value })
                            }
                          />
                        </div>
                        <Button
                          variant="secondary"
                          onClick={handleLocationSearch}
                          disabled={isLocationLookupBusy}
                          className="shrink-0"
                        >
                          {isSearchingLocation ? (
                            <LoaderCircle
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Search className="h-4 w-4" aria-hidden="true" />
                          )}
                          {isSearchingLocation ? 'Searching…' : 'Search'}
                        </Button>
                      </div>

                      {locationSuggestions.length > 0 ? (
                        <div className="mt-3 space-y-2 rounded-2xl border border-orange-950/10 bg-white p-2 shadow-sm">
                          {locationSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.placeId}
                              type="button"
                              className="w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
                              onClick={() =>
                                void handleLocationSelect(suggestion)
                              }
                              disabled={isLocationLookupBusy}
                            >
                              <p className="text-sm font-semibold text-[--orange-9]">
                                {suggestion.primaryText}
                              </p>
                              {suggestion.secondaryText ? (
                                <p className="mt-1 text-sm text-[--orange-8]">
                                  {suggestion.secondaryText}
                                </p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {!isSearchingLocation &&
                      hasSearchedLocation &&
                      locationSuggestions.length === 0 ? (
                        <p className="mt-3 rounded-2xl border border-dashed border-orange-500/20 bg-white px-4 py-3 text-sm text-[--orange-8]">
                          No matching places. Try a broader search.
                        </p>
                      ) : null}
                    </div>

                    <label htmlFor="location-name">
                      <span className="mb-2 block text-sm font-semibold text-[--orange-9]">
                        Location Name
                      </span>
                      <input
                        id="location-name"
                        name="location-name"
                        autoComplete="off"
                        className={mutedInputClassName}
                        value={location.locationName}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            locationName: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label htmlFor="location-region">
                      <span className="mb-2 block text-sm font-semibold text-[--orange-9]">
                        Region
                      </span>
                      <input
                        id="location-region"
                        name="location-region"
                        autoComplete="address-level1"
                        className={mutedInputClassName}
                        value={location.region}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            region: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label htmlFor="location-country">
                      <span className="mb-2 block text-sm font-semibold text-[--orange-9]">
                        Country
                      </span>
                      <input
                        id="location-country"
                        name="location-country"
                        autoComplete="country-name"
                        className={mutedInputClassName}
                        value={location.country}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            country: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label htmlFor="location-latitude">
                      <span className="mb-2 block text-sm font-semibold text-[--orange-9]">
                        Latitude
                      </span>
                      <input
                        id="location-latitude"
                        name="location-latitude"
                        type="number"
                        inputMode="decimal"
                        step="any"
                        className={mutedInputClassName}
                        value={location.latitude ?? ''}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            latitude: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }))
                        }
                      />
                    </label>

                    <label htmlFor="location-longitude">
                      <span className="mb-2 block text-sm font-semibold text-[--orange-9]">
                        Longitude
                      </span>
                      <input
                        id="location-longitude"
                        name="location-longitude"
                        type="number"
                        inputMode="decimal"
                        step="any"
                        className={mutedInputClassName}
                        value={location.longitude ?? ''}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            longitude: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }))
                        }
                      />
                    </label>

                    <label
                      className="sm:col-span-2"
                      htmlFor="location-description"
                    >
                      <span className="mb-2 block text-sm font-semibold text-[--orange-9]">
                        Description
                      </span>
                      <textarea
                        id="location-description"
                        name="location-description"
                        className={`${mutedInputClassName} min-h-24 resize-y`}
                        value={location.description}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </details>
              </div>

              <aside className="rounded-3xl bg-[--orange-9] p-5 text-white shadow-xl xl:sticky xl:top-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200/80">
                  Publish Check
                </p>
                <h3 className="font-display mt-2 text-3xl">
                  {mode === 'create' ? 'Ready to publish?' : 'Ready to save?'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-orange-100/75">
                  Review the essentials, then send your changes live.
                </p>

                <div className="mt-6 space-y-3 border-y border-white/10 py-5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-orange-100/75">Title</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {title.trim() ? (
                        <Check
                          className="h-4 w-4 text-emerald-300"
                          aria-hidden="true"
                        />
                      ) : (
                        <CircleAlert
                          className="h-4 w-4 text-amber-300"
                          aria-hidden="true"
                        />
                      )}
                      {title.trim() ? 'Added' : 'Required'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-orange-100/75">Photos</span>
                    <span className="flex items-center gap-1.5 font-medium tabular-nums">
                      {(mode === 'create'
                        ? previews.length
                        : editingImages.length) > 0 ? (
                        <Check
                          className="h-4 w-4 text-emerald-300"
                          aria-hidden="true"
                        />
                      ) : (
                        <CircleAlert
                          className="h-4 w-4 text-amber-300"
                          aria-hidden="true"
                        />
                      )}
                      {mode === 'create'
                        ? `${previews.length} selected`
                        : `${editingImages.length} saved`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-orange-100/75">Location</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin
                        className="h-4 w-4 text-orange-200"
                        aria-hidden="true"
                      />
                      {hasLocationDraft ? 'Added' : 'Optional'}
                    </span>
                  </div>
                  {mode === 'edit' && previews.length > 0 ? (
                    <div className="rounded-xl bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
                      Add the {previews.length} queued photo(s) before saving
                      collection details.
                    </div>
                  ) : null}
                </div>

                <div
                  className="bg-white/8 mt-5 rounded-2xl p-4"
                  aria-live="polite"
                  aria-busy={isBusy}
                >
                  <p className="flex items-start gap-2 text-sm leading-6 text-orange-50/90">
                    {isBusy ? (
                      <LoaderCircle
                        className="mt-1 h-4 w-4 shrink-0 animate-spin text-orange-200"
                        aria-hidden="true"
                      />
                    ) : hasUnsavedChanges ? (
                      <CircleAlert
                        className="mt-1 h-4 w-4 shrink-0 text-amber-300"
                        aria-hidden="true"
                      />
                    ) : (
                      <Check
                        className="mt-1 h-4 w-4 shrink-0 text-emerald-300"
                        aria-hidden="true"
                      />
                    )}
                    <span>{status}</span>
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  disabled={
                    isBusy ||
                    !title.trim() ||
                    (mode === 'create' && previews.length === 0)
                  }
                  className="mt-4 w-full bg-white"
                >
                  {isPublishing ? (
                    <LoaderCircle
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : mode === 'create' ? (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  {mode === 'create'
                    ? isPublishing
                      ? 'Publishing…'
                      : 'Publish Collection'
                    : isPublishing
                      ? 'Saving…'
                      : 'Save Changes'}
                </Button>

                {mode === 'edit' && selectedCollection ? (
                  <p className="mt-4 text-center text-xs text-orange-100/55">
                    Last updated {formatUpdatedAt(selectedCollection.updatedAt)}
                  </p>
                ) : null}
              </aside>
            </div>
          </form>
        </div>
      </div>

      <Dialog
        open={isDeletePostDialogOpen}
        onOpenChange={(open) => patchUi({ isDeletePostDialogOpen: open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              This removes the collection and all of its uploaded images from D1
              and R2. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => patchUi({ isDeletePostDialogOpen: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCollection}
              disabled={isBusy}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(imagePendingDelete)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            patchUi({ imagePendingDelete: null });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Image</DialogTitle>
            <DialogDescription>
              {imagePendingDelete
                ? `Remove image #${imagePendingDelete.id} from this post? The file in R2 will be deleted too.`
                : 'Remove this image from the current post?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => patchUi({ imagePendingDelete: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteImage}
              disabled={isBusy}
            >
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
