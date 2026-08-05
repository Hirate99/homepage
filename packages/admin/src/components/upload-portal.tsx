'use client';

import {
  ChangeEvent,
  FormEvent,
  startTransition,
  useEffect,
  useRef,
} from 'react';

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
  PaginationButton,
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

const PAGE_SIZE = 6;
const PREVIEW_MAX_EDGE = 720;

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
      const data = (await response.json()) as {
        collections?: CollectionRecord[];
        error?: string;
      };

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
      setStatus(error instanceof Error ? error.message : '加载已有帖子失败。');
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

  async function readLocationHint(files: File[]) {
    if (!files.length) {
      return;
    }

    const payload = new FormData();
    files.forEach((file) => payload.append('images', file));

    setTask('scanLocation', 'pending');
    setStatus('Reading EXIF and looking up location...');

    try {
      const response = await fetch('/api/location-hint', {
        method: 'POST',
        body: payload,
      });
      const data = (await response.json()) as {
        hint?: LocationFields | null;
        error?: string;
      };

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
      const data = (await response.json()) as {
        suggestions?: LocationSuggestion[];
        error?: string;
      };

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
      const data = (await response.json()) as {
        hint?: LocationFields | null;
        error?: string;
      };

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
        setStatus('选择图片开始。');
      }
      return;
    }

    setTask('prepareImages', 'pending');
    setStatus(`Preparing ${files.length} lightweight preview(s)...`);
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
      const data = (await response.json()) as {
        result?: { collectionId: number; uploadedCount: number };
        error?: string;
      };

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
      const data = (await response.json()) as {
        collection?: CollectionRecord;
        error?: string;
      };

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
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

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
      const data = (await response.json()) as {
        collection?: CollectionRecord;
        error?: string;
      };

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
      const data = (await response.json()) as {
        collection?: CollectionRecord;
        error?: string;
      };

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
  const totalPages = Math.max(1, Math.ceil(collections.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageCollections = collections.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );
  const isBusy =
    isScanningLocation ||
    isPublishing ||
    isDeleting ||
    isUploadingImages ||
    isPreparingImages ||
    isApplyingLocation;
  const isLocationLookupBusy = isSearchingLocation || isApplyingLocation;

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <section className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-orange-950/10 pb-5">
          <div className="max-w-2xl">
            <p className="font-sans text-sm uppercase tracking-[0.18em] text-[--orange-7]">
              Homepage Admin
            </p>
            <h1 className="font-display mt-1 text-4xl font-medium leading-none text-[--orange-9]">
              Collections
            </h1>
            <p className="mt-2 text-sm leading-6 text-[--orange-8]">
              Write, arrange images, and publish from one focused workspace.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetForCreate}>
              New Post
            </Button>
            <Button
              variant="subtle"
              onClick={() => void refreshCollections(selectedCollectionId)}
            >
              Refresh
            </Button>
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="self-start rounded-3xl border border-orange-950/10 bg-white p-3 shadow-sm lg:sticky lg:top-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.18em] text-[--orange-7]">
                  Existing
                </p>
                <h2 className="font-display mt-1 text-2xl text-[--orange-9]">
                  Posts
                </h2>
              </div>
              <span className="text-sm text-[--orange-8]">
                {isLoadingCollections ? '...' : collections.length}
              </span>
            </div>

            <div className="space-y-3">
              {collections.length === 0 ? (
                <div className="border-orange-500/18 rounded-[24px] border border-dashed bg-orange-50/60 p-4 text-sm text-[--orange-8]">
                  No collections yet.
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
                      onClick={() => loadCollectionIntoForm(collection)}
                      className={`flex w-full items-center overflow-hidden rounded-2xl border text-left transition-colors ${
                        active
                          ? 'border-orange-500/45 bg-orange-50'
                          : 'border-orange-500/10 bg-white hover:border-orange-500/25 hover:bg-orange-50/50'
                      }`}
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.src}
                          alt={collection.title}
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
                          <span className="text-xs uppercase tracking-[0.12em] text-[--orange-7]">
                            {collection.images.length} img
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

            {collections.length > PAGE_SIZE ? (
              <Pagination className="mt-4 border-t border-orange-500/10 pt-4">
                <PaginationContent>
                  <PaginationPrevious
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={safeCurrentPage === 1}
                  />
                  <div className="flex items-center gap-2">
                    {Array.from(
                      { length: totalPages },
                      (_, index) => index + 1,
                    ).map((page) => (
                      <PaginationButton
                        key={page}
                        isActive={page === safeCurrentPage}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </PaginationButton>
                    ))}
                  </div>
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
            ref={formRef}
            onSubmit={mode === 'create' ? handleCreate : handleUpdate}
            className="rounded-3xl border border-orange-950/10 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-sans text-sm uppercase tracking-[0.18em] text-[--orange-7]">
                  {mode === 'create' ? 'Create' : 'Manage'}
                </p>
                <h2 className="font-display mt-2 text-4xl text-[--orange-9]">
                  {mode === 'create'
                    ? 'New Collection'
                    : selectedCollection
                      ? `#${selectedCollection.id}`
                      : 'Edit'}
                </h2>
              </div>

              {mode === 'edit' ? (
                <Button
                  variant="destructive"
                  onClick={() => patchUi({ isDeletePostDialogOpen: true })}
                  disabled={isBusy}
                >
                  Delete
                </Button>
              ) : null}
            </div>

            <div className="grid gap-6">
              <section className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-2 block font-sans text-sm uppercase tracking-[0.14em] text-[--orange-7]">
                      Title
                    </span>
                    <input
                      className="w-full rounded-2xl border border-orange-500/15 bg-white px-4 py-3 text-[--orange-9] outline-none transition focus:border-orange-500/45"
                      value={title}
                      onChange={(event) =>
                        patchDraft({ title: event.target.value })
                      }
                      required
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block font-sans text-sm uppercase tracking-[0.14em] text-[--orange-7]">
                      Content
                    </span>
                    <textarea
                      className="min-h-32 w-full rounded-2xl border border-orange-500/15 bg-white px-4 py-3 text-[--orange-9] outline-none transition focus:border-orange-500/45"
                      value={content}
                      onChange={(event) =>
                        patchDraft({ content: event.target.value })
                      }
                    />
                  </label>

                  <label>
                    <span className="mb-2 block font-sans text-sm uppercase tracking-[0.14em] text-[--orange-7]">
                      Sort Order
                    </span>
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-orange-500/15 bg-white px-4 py-3 text-[--orange-9] outline-none transition focus:border-orange-500/45"
                      value={sortOrder}
                      onChange={(event) =>
                        patchDraft({ sortOrder: event.target.value })
                      }
                    />
                  </label>
                </div>

                {mode === 'edit' && previews.length > 0 ? (
                  <div className="border-orange-500/12 flex items-center justify-between gap-3 rounded-[24px] border bg-white/70 p-4">
                    <p className="text-sm text-[--orange-8]">
                      {previews.length} image(s) queued to append.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={handleAppendImages}
                      disabled={isBusy}
                    >
                      {isUploadingImages ? 'Uploading...' : 'Append Images'}
                    </Button>
                  </div>
                ) : null}

                <div className="rounded-3xl border border-orange-500/15 bg-orange-50/50 p-4 sm:p-5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-2xl text-[--orange-9]">
                        Images
                      </h3>
                      <p className="text-sm text-[--orange-8]">
                        {mode === 'create'
                          ? 'Upload images and choose the lead frame.'
                          : 'Manage images and choose the lead frame.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                      >
                        Add Images
                      </Button>
                      {mode === 'create' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            readLocationHint(previews.map((item) => item.file))
                          }
                          disabled={isScanningLocation || previews.length === 0}
                        >
                          Read Location
                        </Button>
                      ) : null}
                    </div>
                  </div>

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
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                                className="aspect-[4/3] w-full object-cover"
                              />
                              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                                <span className="bg-white/88 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[--orange-9] shadow-sm">
                                  New {index + 1}
                                </span>
                                {coverPreviewId === preview.id ? (
                                  <span className="rounded-full bg-[--orange-9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
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
                                    Delete
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
                              loading="lazy"
                              decoding="async"
                              draggable={false}
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                              <span className="bg-white/88 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[--orange-9] shadow-sm">
                                Image {index + 1}
                              </span>
                              {editingCoverImageId === image.id ? (
                                <span className="rounded-full bg-[--orange-9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
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

              <div className="space-y-5">
                <details className="group rounded-3xl border border-orange-500/15 bg-orange-50/40 p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="font-display text-2xl text-[--orange-9]">
                      Location
                    </span>
                    <span className="max-w-[60%] truncate text-sm text-[--orange-7]">
                      {location.locationName ||
                        location.country ||
                        'Optional details'}
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-[--orange-8]">
                    EXIF can prefill coordinates. Search and pick a place when
                    needed.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-orange-500/15 bg-white p-4 sm:col-span-2 lg:col-span-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-[--orange-7]">
                          Lookup
                        </p>
                        <span className="text-[11px] uppercase tracking-[0.14em] text-[--orange-7]">
                          Google Places
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <input
                            className="w-full rounded-2xl border border-orange-500/15 bg-white px-4 py-3 outline-none transition focus:border-orange-500/45"
                            placeholder="Tokyo, Japan"
                            value={locationQuery}
                            onChange={(event) =>
                              patchLocationSearch({
                                query: event.target.value,
                              })
                            }
                          />
                          <Button
                            variant="secondary"
                            onClick={handleLocationSearch}
                            disabled={isLocationLookupBusy}
                            className="shrink-0"
                          >
                            Search
                          </Button>
                        </div>

                        {isSearchingLocation ? (
                          <div className="border-orange-500/12 rounded-2xl border bg-white/85 px-4 py-3 text-sm text-[--orange-8]">
                            Searching places...
                          </div>
                        ) : null}

                        {locationSuggestions.length > 0 ? (
                          <div className="border-orange-500/12 bg-white/88 space-y-2 rounded-[22px] border p-2 shadow-[0_12px_30px_rgba(95,44,15,0.06)]">
                            {locationSuggestions.map((suggestion) => (
                              <button
                                key={suggestion.placeId}
                                type="button"
                                className="w-full rounded-[18px] px-3 py-3 text-left transition hover:bg-orange-50"
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
                          <div className="border-orange-500/16 rounded-2xl border border-dashed bg-white/80 px-4 py-3 text-sm text-[--orange-8]">
                            No matching places.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <label>
                      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[--orange-7]">
                        Latitude
                      </span>
                      <input
                        type="number"
                        step="any"
                        className="w-full rounded-2xl border border-orange-500/15 bg-orange-50/70 px-4 py-3 outline-none transition focus:border-orange-500/45"
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

                    <label>
                      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[--orange-7]">
                        Longitude
                      </span>
                      <input
                        type="number"
                        step="any"
                        className="w-full rounded-2xl border border-orange-500/15 bg-orange-50/70 px-4 py-3 outline-none transition focus:border-orange-500/45"
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

                    <label>
                      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[--orange-7]">
                        Location Name
                      </span>
                      <input
                        className="w-full rounded-2xl border border-orange-500/15 bg-orange-50/70 px-4 py-3 outline-none transition focus:border-orange-500/45"
                        value={location.locationName}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            locationName: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[--orange-7]">
                        Region
                      </span>
                      <input
                        className="w-full rounded-2xl border border-orange-500/15 bg-orange-50/70 px-4 py-3 outline-none transition focus:border-orange-500/45"
                        value={location.region}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            region: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[--orange-7]">
                        Country
                      </span>
                      <input
                        className="w-full rounded-2xl border border-orange-500/15 bg-orange-50/70 px-4 py-3 outline-none transition focus:border-orange-500/45"
                        value={location.country}
                        onChange={(event) =>
                          updateLocation((current) => ({
                            ...current,
                            country: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[--orange-7]">
                        Description
                      </span>
                      <textarea
                        className="min-h-24 w-full rounded-2xl border border-orange-500/15 bg-orange-50/70 px-4 py-3 outline-none transition focus:border-orange-500/45"
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

                <section
                  className="sticky bottom-3 z-20 rounded-2xl border border-orange-950/10 bg-[--orange-9] p-4 text-white shadow-xl sm:flex sm:items-center sm:gap-4"
                  aria-live="polite"
                  aria-busy={isBusy}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-orange-200/80">
                    Status
                  </p>
                  <p className="mt-2 min-w-0 flex-1 text-sm leading-6 text-orange-100/90 sm:mt-0">
                    {status}
                  </p>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={isBusy}
                    className="mt-4 w-full bg-white sm:ml-auto sm:mt-0 sm:w-auto sm:min-w-36"
                  >
                    {mode === 'create'
                      ? isPublishing
                        ? 'Publishing...'
                        : 'Publish'
                      : isPublishing
                        ? 'Saving...'
                        : 'Save Changes'}
                  </Button>
                </section>
              </div>
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
