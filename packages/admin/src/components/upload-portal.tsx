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
  Images,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Smartphone,
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
  'w-full rounded-xl border border-black/10 bg-[#f7f7f7] px-4 py-3 text-[--studio-ink] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-black/35 focus:border-[--studio-accent] focus:bg-white focus:ring-4 focus:ring-[--studio-accent-soft]';

const mutedInputClassName =
  'w-full rounded-xl border border-black/10 bg-[#f7f7f7] px-4 py-3 text-[--studio-ink] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-black/35 focus:border-[--studio-accent] focus:bg-white focus:ring-4 focus:ring-[--studio-accent-soft]';

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
    setStatus('Reading EXIF data and looking up the location...');

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
      setStatus(`Looking up "${normalizedQuery}"...`);
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
    setStatus(`Using "${suggestion.text}"...`);

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
    setStatus(`Preparing ${files.length} preview(s)...`);
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
    setStatus('Uploading originals and publishing...');

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
    setStatus('Saving changes...');

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
    setStatus('Deleting collection...');

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
    setStatus(`Uploading ${files.length} new image(s)...`);

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
    setStatus(`Deleting image #${imagePendingDelete.id}...`);

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
  const imageCount =
    mode === 'create'
      ? previews.length
      : editingImages.length + previews.length;
  const coverImageSrc =
    mode === 'create'
      ? (previews.find((item) => item.id === coverPreviewId) ?? previews[0])
          ?.url
      : (
          editingImages.find((image) => image.id === editingCoverImageId) ??
          editingImages[0]
        )?.src;
  const locationLabel = [
    location.locationName,
    location.region,
    location.country,
  ]
    .filter(Boolean)
    .join(' / ');
  const canSubmit =
    !isBusy &&
    Boolean(title.trim()) &&
    (mode === 'edit' || previews.length > 0);

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
      className="min-h-screen bg-[--studio-canvas] pb-28 xl:pb-10"
    >
      <a
        href="#collection-editor"
        className="sr-only z-50 rounded-full bg-[--studio-accent] px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to editor
      </a>

      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[--studio-accent] text-sm font-black text-white shadow-[0_8px_24px_rgba(255,48,77,0.24)]">
              M
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[--studio-ink]">
                MSKY Studio
              </p>
              <p className="hidden text-xs text-[--studio-muted] sm:block">
                Collection publishing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-[--studio-accent-soft] px-3 py-1.5 text-xs font-semibold text-[--studio-accent] sm:inline-flex">
              {collections.length} collections
            </span>
            <Button
              variant="ghost"
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
            <Button
              onClick={startNewCollection}
              className="hidden sm:inline-flex"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New post
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1720px] items-start gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-black/5 bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.04)] lg:sticky lg:top-20">
          <Button
            onClick={startNewCollection}
            className="w-full sm:hidden lg:inline-flex"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create collection
          </Button>

          <div className="mt-3 flex items-center justify-between px-2">
            <div>
              <p className="text-xs font-semibold text-[--studio-muted]">
                CONTENT
              </p>
              <h2 className="mt-1 text-lg font-bold text-[--studio-ink]">
                Collection library
              </h2>
            </div>
            <Images
              className="h-5 w-5 text-[--studio-muted]"
              aria-hidden="true"
            />
          </div>

          <label className="relative mt-3 block">
            <span className="sr-only">Search collections</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--studio-muted]"
              aria-hidden="true"
            />
            <input
              type="search"
              name="collection-search"
              autoComplete="off"
              placeholder="Search title or place"
              value={collectionQuery}
              onChange={(event) => {
                setCollectionQuery(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-transparent bg-[#f5f5f5] py-3 pl-10 pr-10 text-sm text-[--studio-ink] outline-none transition placeholder:text-black/35 focus:border-[--studio-accent] focus:bg-white focus:ring-4 focus:ring-[--studio-accent-soft]"
            />
            {collectionQuery ? (
              <button
                type="button"
                aria-label="Clear collection search"
                onClick={() => {
                  setCollectionQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[--studio-muted] hover:bg-white hover:text-[--studio-ink] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--studio-accent]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:block lg:max-h-[calc(100vh-16.5rem)] lg:space-y-1.5 lg:overflow-y-auto lg:pr-1">
            {filteredCollections.length === 0 ? (
              <div className="min-w-full rounded-xl border border-dashed border-black/10 bg-[#fafafa] p-5 text-sm leading-6 text-[--studio-muted]">
                {collections.length === 0
                  ? 'No collections yet. Start with your first post.'
                  : `No results for "${collectionQuery.trim()}".`}
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
                    className={`flex min-w-64 items-center gap-3 rounded-xl p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--studio-accent] lg:w-full lg:min-w-0 ${
                      active
                        ? 'bg-[--studio-accent-soft]'
                        : 'hover:bg-[#f6f6f6]'
                    }`}
                  >
                    <span className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#efefef]">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.src}
                          alt=""
                          width={112}
                          height={128}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="grid h-full place-items-center">
                          <FileImage
                            className="h-5 w-5 text-black/25"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[--studio-ink]">
                        {collection.title || `Collection #${collection.id}`}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[--studio-muted]">
                        {collection.locationName ||
                          `${collection.images.length} photos`}
                      </span>
                      <span className="mt-1 block text-[11px] text-black/35">
                        {formatUpdatedAt(collection.updatedAt)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {filteredCollections.length > PAGE_SIZE ? (
            <Pagination className="mt-3 border-t border-black/5 pt-3">
              <PaginationContent>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeCurrentPage === 1}
                />
                <span className="text-xs tabular-nums text-[--studio-muted]">
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
          className="min-w-0 scroll-mt-24"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#f2f2f2] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[--studio-muted]">
                  {mode === 'create' ? 'New' : 'Published'}
                </span>
                <h1 className="truncate text-lg font-bold text-[--studio-ink]">
                  {mode === 'create'
                    ? 'Create a collection'
                    : selectedCollection?.title || 'Edit collection'}
                </h1>
              </div>
              <p
                className="mt-1 flex items-center gap-1.5 text-xs text-[--studio-muted]"
                aria-live="polite"
              >
                {hasUnsavedChanges ? (
                  <CircleAlert
                    className="h-3.5 w-3.5 text-amber-500"
                    aria-hidden="true"
                  />
                ) : (
                  <Check
                    className="h-3.5 w-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                )}
                {hasUnsavedChanges
                  ? 'Unsaved changes'
                  : 'Everything is up to date'}
              </p>
            </div>
            {mode === 'edit' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => patchUi({ isDeletePostDialogOpen: true })}
                disabled={isBusy}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            ) : null}
          </div>

          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-[--studio-ink]">
                      Photos
                    </p>
                    <p className="mt-1 text-xs text-[--studio-muted]">
                      {imageCount}/20 / Drag to reorder / Choose one cover
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {previews.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          readLocationHint(previews.map((item) => item.file))
                        }
                        disabled={isScanningLocation || isBusy}
                      >
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        {isScanningLocation ? 'Reading...' : 'Read location'}
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                    >
                      {isPreparingImages ? (
                        <LoaderCircle
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ImagePlus className="h-4 w-4" aria-hidden="true" />
                      )}
                      Add photos
                    </Button>
                  </div>
                </div>

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

                {mode === 'create' && previews.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBusy}
                    className="mt-4 flex min-h-60 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-[#fafafa] px-6 text-center transition hover:border-[--studio-accent] hover:bg-[--studio-accent-soft] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[--studio-accent-soft] disabled:opacity-60"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm">
                      <ImagePlus
                        className="h-6 w-6 text-[--studio-accent]"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-4 font-semibold text-[--studio-ink]">
                      Upload your photo story
                    </span>
                    <span className="mt-1 text-sm text-[--studio-muted]">
                      Multiple images supported / up to 20 MB each
                    </span>
                  </button>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {mode === 'create'
                    ? previews.map((preview, index) => (
                        <article
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
                          className="group relative overflow-hidden rounded-xl bg-[#efefef] focus-within:ring-2 focus-within:ring-[--studio-accent]"
                        >
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
                          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent p-2.5 text-white">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold">
                              <GripVertical
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              {index + 1}
                            </span>
                            {coverPreviewId === preview.id ? (
                              <span className="rounded-full bg-[--studio-accent] px-2 py-1 text-[10px] font-bold">
                                COVER
                              </span>
                            ) : null}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/65 to-transparent p-2">
                            <button
                              type="button"
                              aria-label={`Move ${preview.file.name} earlier`}
                              onClick={() => movePreview(preview.id, -1)}
                              disabled={isBusy || index === 0}
                              className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55 disabled:opacity-35"
                            >
                              <ArrowLeft
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${preview.file.name} later`}
                              onClick={() => movePreview(preview.id, 1)}
                              disabled={isBusy || index === previews.length - 1}
                              className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55 disabled:opacity-35"
                            >
                              <ArrowRight
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              aria-label={`Set ${preview.file.name} as cover`}
                              onClick={() => setCoverPreviewId(preview.id)}
                              disabled={isBusy}
                              className={`grid h-9 w-9 place-items-center rounded-full text-white backdrop-blur ${
                                coverPreviewId === preview.id
                                  ? 'bg-[--studio-accent]'
                                  : 'bg-black/35 hover:bg-black/55'
                              }`}
                            >
                              <Star className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${preview.file.name}`}
                              onClick={() => removePreview(preview.id)}
                              disabled={isBusy}
                              className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-red-500"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </article>
                      ))
                    : editingImages.map((image, index) => (
                        <article
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
                          className="group relative overflow-hidden rounded-xl bg-[#efefef] focus-within:ring-2 focus-within:ring-[--studio-accent]"
                        >
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
                          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent p-2.5 text-white">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold">
                              <GripVertical
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              {index + 1}
                            </span>
                            {editingCoverImageId === image.id ? (
                              <span className="rounded-full bg-[--studio-accent] px-2 py-1 text-[10px] font-bold">
                                COVER
                              </span>
                            ) : null}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/65 to-transparent p-2">
                            <button
                              type="button"
                              aria-label="Move image earlier"
                              onClick={() => moveEditingImage(image.id, -1)}
                              disabled={isBusy || index === 0}
                              className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55 disabled:opacity-35"
                            >
                              <ArrowLeft
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              aria-label="Move image later"
                              onClick={() => moveEditingImage(image.id, 1)}
                              disabled={
                                isBusy || index === editingImages.length - 1
                              }
                              className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55 disabled:opacity-35"
                            >
                              <ArrowRight
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              aria-label="Set image as cover"
                              onClick={() =>
                                patchDraft({ editingCoverImageId: image.id })
                              }
                              disabled={isBusy}
                              className={`grid h-9 w-9 place-items-center rounded-full text-white backdrop-blur ${
                                editingCoverImageId === image.id
                                  ? 'bg-[--studio-accent]'
                                  : 'bg-black/35 hover:bg-black/55'
                              }`}
                            >
                              <Star className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete image"
                              onClick={() =>
                                patchUi({ imagePendingDelete: image })
                              }
                              disabled={isBusy}
                              className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-red-500"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </article>
                      ))}
                </div>

                {mode === 'edit' &&
                editingImages.length === 0 &&
                previews.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-[#fafafa] text-[--studio-muted] hover:border-[--studio-accent] hover:bg-[--studio-accent-soft]"
                  >
                    <ImagePlus className="h-6 w-6" aria-hidden="true" />
                    <span className="mt-2 text-sm font-semibold">
                      Add the first photo
                    </span>
                  </button>
                ) : null}

                {mode === 'edit' && previews.length > 0 ? (
                  <div className="border-[--studio-accent]/15 mt-4 rounded-xl border bg-[--studio-accent-soft] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[--studio-ink]">
                        {previews.length} new photo
                        {previews.length === 1 ? '' : 's'} ready
                      </p>
                      <Button
                        onClick={handleAppendImages}
                        disabled={isBusy}
                        size="sm"
                      >
                        {isUploadingImages ? (
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isUploadingImages
                          ? 'Uploading...'
                          : 'Add to collection'}
                      </Button>
                    </div>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {previews.map((preview) => (
                        <div
                          key={preview.id}
                          className="group relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={preview.url}
                            alt={preview.file.name}
                            width={256}
                            height={192}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Remove ${preview.file.name}`}
                            onClick={() => removePreview(preview.id)}
                            className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-black/5 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
                <label
                  className="block border-b border-black/5 px-5 py-4"
                  htmlFor="collection-title"
                >
                  <span className="sr-only">Title</span>
                  <input
                    id="collection-title"
                    name="title"
                    autoComplete="off"
                    placeholder="Add a clear, memorable title"
                    className="w-full bg-transparent text-xl font-bold text-[--studio-ink] outline-none placeholder:text-black/25 sm:text-2xl"
                    value={title}
                    onChange={(event) =>
                      patchDraft({ title: event.target.value })
                    }
                    required
                  />
                  <span className="mt-2 block text-right text-xs tabular-nums text-black/30">
                    {title.length}
                  </span>
                </label>

                <label className="block px-5 py-4" htmlFor="collection-content">
                  <span className="sr-only">Content</span>
                  <textarea
                    id="collection-content"
                    name="content"
                    autoComplete="off"
                    placeholder="Tell the story behind this collection..."
                    className="min-h-52 w-full resize-y bg-transparent text-[15px] leading-7 text-[--studio-ink] outline-none placeholder:text-black/25"
                    value={content}
                    onChange={(event) =>
                      patchDraft({ content: event.target.value })
                    }
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3">
                    <div className="flex flex-wrap gap-2 text-xs text-[--studio-muted]">
                      <span className="rounded-full bg-[#f5f5f5] px-3 py-1.5">
                        # photo collection
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-3 py-1.5">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {locationLabel || 'Location optional'}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums text-black/30">
                      {content.length}
                    </span>
                  </div>
                </label>
              </section>

              <details
                id="publish-settings"
                className="group rounded-2xl border border-black/5 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.04)]"
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 outline-none focus-visible:ring-4 focus-visible:ring-[--studio-accent-soft]">
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f5f5f5] text-[--studio-muted]">
                      <Settings2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[--studio-ink]">
                        More settings
                      </span>
                      <span className="mt-0.5 block text-xs text-[--studio-muted]">
                        {locationLabel || 'Location and display order'}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[--studio-accent] group-open:hidden">
                    Expand
                  </span>
                  <span className="hidden text-xs font-semibold text-[--studio-accent] group-open:inline">
                    Collapse
                  </span>
                </summary>

                <div className="border-t border-black/5 p-5">
                  <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                    <label htmlFor="collection-sort-order">
                      <span className="mb-2 block text-sm font-semibold text-[--studio-ink]">
                        Display order
                      </span>
                      <input
                        id="collection-sort-order"
                        name="sort-order"
                        type="number"
                        inputMode="numeric"
                        placeholder="Automatic"
                        className={inputClassName}
                        value={sortOrder}
                        onChange={(event) =>
                          patchDraft({ sortOrder: event.target.value })
                        }
                      />
                      <span className="mt-2 block text-xs leading-5 text-[--studio-muted]">
                        Lower numbers appear first.
                      </span>
                    </label>

                    <div>
                      <label
                        className="mb-2 block text-sm font-semibold text-[--studio-ink]"
                        htmlFor="location-search"
                      >
                        Search location
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                          <Search
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--studio-muted]"
                            aria-hidden="true"
                          />
                          <input
                            id="location-search"
                            name="location-search"
                            autoComplete="off"
                            className={`${inputClassName} pl-10`}
                            placeholder="City, landmark, or place"
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
                        >
                          {isSearchingLocation ? (
                            <LoaderCircle
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Search className="h-4 w-4" aria-hidden="true" />
                          )}
                          {isSearchingLocation ? 'Searching...' : 'Search'}
                        </Button>
                      </div>

                      {locationSuggestions.length > 0 ? (
                        <div className="mt-2 space-y-1 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
                          {locationSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.placeId}
                              type="button"
                              className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--studio-accent]"
                              onClick={() =>
                                void handleLocationSelect(suggestion)
                              }
                              disabled={isLocationLookupBusy}
                            >
                              <span className="block text-sm font-semibold text-[--studio-ink]">
                                {suggestion.primaryText}
                              </span>
                              {suggestion.secondaryText ? (
                                <span className="mt-0.5 block text-xs text-[--studio-muted]">
                                  {suggestion.secondaryText}
                                </span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {!isSearchingLocation &&
                      hasSearchedLocation &&
                      locationSuggestions.length === 0 ? (
                        <p className="mt-2 rounded-xl bg-[#f7f7f7] px-3 py-2 text-sm text-[--studio-muted]">
                          No matching places. Try a broader search.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label htmlFor="location-name">
                      <span className="mb-2 block text-sm font-semibold text-[--studio-ink]">
                        Location name
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
                      <span className="mb-2 block text-sm font-semibold text-[--studio-ink]">
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
                      <span className="mb-2 block text-sm font-semibold text-[--studio-ink]">
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
                      <span className="mb-2 block text-sm font-semibold text-[--studio-ink]">
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
                      <span className="mb-2 block text-sm font-semibold text-[--studio-ink]">
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
                      className="sm:col-span-2 lg:col-span-3"
                      htmlFor="location-description"
                    >
                      <span className="mb-2 block text-sm font-semibold text-[--studio-ink]">
                        Location note
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
                </div>
              </details>
            </div>

            <aside className="hidden space-y-4 xl:sticky xl:top-20 xl:block">
              <div>
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[--studio-ink]">
                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                    Mobile preview
                  </p>
                  <span className="text-xs text-[--studio-muted]">Live</span>
                </div>
                <div className="mx-auto max-w-[292px] rounded-[34px] border-[7px] border-[#181818] bg-white p-2 shadow-[0_28px_70px_rgba(0,0,0,0.18)]">
                  <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-black/80" />
                  <div className="max-h-[530px] overflow-y-auto rounded-[23px] bg-white">
                    <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-black/70">
                      <span>9:41</span>
                      <span>Preview</span>
                    </div>
                    <div className="aspect-[4/3] overflow-hidden bg-[#f1f1f1]">
                      {coverImageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverImageSrc}
                          alt="Collection cover preview"
                          width={720}
                          height={540}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-center text-xs text-black/35">
                          <span>
                            <ImagePlus
                              className="mx-auto mb-2 h-7 w-7"
                              aria-hidden="true"
                            />
                            Your cover appears here
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-3.5">
                      <h2 className="text-[15px] font-bold leading-5 text-[#202020]">
                        {title.trim() || 'Your collection title'}
                      </h2>
                      <p className="mt-2 max-h-28 overflow-hidden whitespace-pre-wrap text-xs leading-5 text-[#565656]">
                        {content.trim() ||
                          'Tell the story behind these photographs. Your description will preview here as you type.'}
                      </p>
                      {locationLabel ? (
                        <p className="mt-3 flex items-center gap-1 text-[11px] text-[#777]">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {locationLabel}
                        </p>
                      ) : null}
                      <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-[10px] text-black/35">
                        <span>MSKYurina</span>
                        <span>{imageCount} photos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[--studio-muted]">Ready check</span>
                  <span
                    className={`font-semibold ${canSubmit ? 'text-emerald-600' : 'text-amber-600'}`}
                  >
                    {canSubmit ? 'Ready' : 'Needs attention'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span
                    className={`rounded-lg px-2.5 py-2 ${title.trim() ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                  >
                    {title.trim() ? 'OK' : '!'} Title
                  </span>
                  <span
                    className={`rounded-lg px-2.5 py-2 ${imageCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                  >
                    {imageCount > 0 ? 'OK' : '!'} Photos
                  </span>
                </div>
                <div
                  className="mt-3 rounded-xl bg-[#f7f7f7] px-3 py-2.5"
                  aria-live="polite"
                  aria-busy={isBusy}
                >
                  <p className="flex items-start gap-2 text-xs leading-5 text-[--studio-muted]">
                    {isBusy ? (
                      <LoaderCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[--studio-accent]"
                        aria-hidden="true"
                      />
                    ) : hasUnsavedChanges ? (
                      <CircleAlert
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                    )}
                    <span>{status}</span>
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-3 w-full"
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
                      ? 'Publishing...'
                      : 'Publish collection'
                    : isPublishing
                      ? 'Saving...'
                      : 'Save changes'}
                </Button>
                {mode === 'edit' && selectedCollection ? (
                  <p className="mt-3 text-center text-[11px] text-black/35">
                    Updated {formatUpdatedAt(selectedCollection.updatedAt)}
                  </p>
                ) : null}
              </div>
            </aside>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 px-4 py-3 shadow-[0_-8px_28px_rgba(0,0,0,0.08)] backdrop-blur-xl xl:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="truncate text-xs font-semibold text-[--studio-ink]">
                  {hasUnsavedChanges ? 'Unsaved changes' : 'Up to date'}
                </p>
                <p className="truncate text-[11px] text-[--studio-muted]">
                  {status}
                </p>
              </div>
              <Button type="submit" disabled={!canSubmit}>
                {isPublishing ? (
                  <LoaderCircle
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {mode === 'create' ? 'Publish' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>
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
