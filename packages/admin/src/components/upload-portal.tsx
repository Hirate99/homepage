'use client';

import {
  ChangeEvent,
  FormEvent,
  startTransition,
  useEffect,
  useRef,
  useState,
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

interface LocationHint {
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  country: string;
  region: string;
  description: string;
}

interface LocationSuggestion {
  placeId: string;
  text: string;
  primaryText: string;
  secondaryText: string;
}

interface CollectionImage {
  id: number;
  src: string;
  width: number | null;
  height: number | null;
}

interface CollectionRecord {
  id: number;
  title: string;
  content: string | null;
  sortOrder: number | null;
  locationName: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  coverImageId: number | null;
  images: CollectionImage[];
  createdAt: string;
  updatedAt: string;
}

interface PreviewItem {
  id: string;
  file: File;
  url: string;
}

const emptyLocation: LocationHint = {
  latitude: null,
  longitude: null,
  locationName: '',
  country: '',
  region: '',
  description: '',
};

type Mode = 'create' | 'edit';
const PAGE_SIZE = 3;

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
  const [mode, setMode] = useState<Mode>('create');
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [location, setLocation] = useState<LocationHint>(emptyLocation);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [editingCoverImageId, setEditingCoverImageId] = useState<number | null>(
    null,
  );
  const [status, setStatus] = useState('选择图片开始。');
  const [isScanningLocation, setIsScanningLocation] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isApplyingLocation, setIsApplyingLocation] = useState(false);
  const [hasSearchedLocation, setHasSearchedLocation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeletePostDialogOpen, setIsDeletePostDialogOpen] = useState(false);
  const [imagePendingDelete, setImagePendingDelete] =
    useState<CollectionImage | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipNextLocationLookupRef = useRef(false);

  useEffect(() => {
    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previews]);

  useEffect(() => {
    const normalizedQuery = locationQuery.trim();

    if (skipNextLocationLookupRef.current) {
      skipNextLocationLookupRef.current = false;
      return;
    }

    if (normalizedQuery.length < 2) {
      setLocationSuggestions([]);
      setHasSearchedLocation(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchLocationSuggestions(normalizedQuery, false);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [locationQuery]);

  async function refreshCollections(nextSelectedId?: number | null) {
    setIsLoadingCollections(true);

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
        setCurrentPage(getPageForCollection(nextCollections, match.id));
        loadCollectionIntoForm(match);
      } else {
        setCurrentPage(1);
        resetForCreate();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '加载已有帖子失败。');
    } finally {
      setIsLoadingCollections(false);
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
    startTransition(() => {
      setMode('create');
      setSelectedCollectionId(null);
      setTitle('');
      setContent('');
      setSortOrder('');
      setLocation(emptyLocation);
      setLocationQuery('');
      setLocationSuggestions([]);
      setHasSearchedLocation(false);
      setEditingCoverImageId(null);
      setCoverIndex(0);
      setCurrentPage(1);
      resetPreviews();
      formRef.current?.reset();
      setStatus('选择图片开始。');
    });
  }

  function loadCollectionIntoForm(collection: CollectionRecord) {
    startTransition(() => {
      setMode('edit');
      setSelectedCollectionId(collection.id);
      setTitle(collection.title);
      setContent(collection.content ?? '');
      setSortOrder(
        collection.sortOrder === null ? '' : String(collection.sortOrder),
      );
      setLocation({
        latitude: collection.latitude,
        longitude: collection.longitude,
        locationName: collection.locationName ?? '',
        country: collection.country ?? '',
        region: collection.region ?? '',
        description: collection.description ?? '',
      });
      setLocationQuery('');
      setLocationSuggestions([]);
      setHasSearchedLocation(false);
      setEditingCoverImageId(collection.coverImageId);
      setCurrentPage(getPageForCollection(collections, collection.id));
      resetPreviews();
      formRef.current?.reset();
      setStatus(`Editing #${collection.id}.`);
    });
  }

  async function readLocationHint(files: File[]) {
    if (!files.length) {
      return;
    }

    const payload = new FormData();
    files.forEach((file) => payload.append('images', file));

    setIsScanningLocation(true);
    setStatus('Reading EXIF and looking up location...');

    try {
      const response = await fetch('/api/location-hint', {
        method: 'POST',
        body: payload,
      });
      const data = (await response.json()) as {
        hint?: LocationHint | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? 'Location lookup failed.');
      }

      if (!data.hint) {
        setStatus('No GPS metadata found.');
        return;
      }

      setLocation((current) => ({
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
      setIsScanningLocation(false);
    }
  }

  async function fetchLocationSuggestions(
    queryText: string,
    announce: boolean,
  ) {
    const normalizedQuery = queryText.trim();
    if (normalizedQuery.length < 2) {
      setLocationSuggestions([]);
      setHasSearchedLocation(false);
      return;
    }

    setIsSearchingLocation(true);
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
      setLocationSuggestions(suggestions);
      setHasSearchedLocation(true);

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

      setLocationSuggestions([]);
      setHasSearchedLocation(false);
      if (announce) {
        setStatus(message);
      }
    } finally {
      setIsSearchingLocation(false);
    }
  }

  async function handleLocationSearch() {
    if (!locationQuery.trim()) {
      setLocationSuggestions([]);
      setHasSearchedLocation(false);
      setStatus('Enter a place to search.');
      return;
    }

    await fetchLocationSuggestions(locationQuery, true);
  }

  async function handleLocationSelect(suggestion: LocationSuggestion) {
    setIsApplyingLocation(true);
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
        hint?: LocationHint | null;
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
      setLocationQuery(suggestion.text);
      setLocationSuggestions([]);
      setHasSearchedLocation(false);
      setLocation((current) => ({
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
      setIsApplyingLocation(false);
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

    setPreviews((current) => {
      const nextItems = files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      }));

      if (mode === 'edit') {
        return nextItems;
      }

      return [...current, ...nextItems];
    });

    if (mode !== 'edit' && previews.length === 0) {
      setCoverIndex(0);
    }

    if (mode === 'edit') {
      setStatus(
        files.length > 0
          ? `${files.length} image(s) ready to append.`
          : 'No new images selected.',
      );
      return;
    }

    await readLocationHint(files);
  }

  function removePreview(previewId: string) {
    setPreviews((current) => {
      const index = current.findIndex((item) => item.id === previewId);
      if (index === -1) {
        return current;
      }

      const target = current[index];
      URL.revokeObjectURL(target.url);

      setCoverIndex((selected) => {
        if (selected === index) {
          return 0;
        }

        if (selected > index) {
          return selected - 1;
        }

        return selected;
      });

      return current.filter((item) => item.id !== previewId);
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

    setIsPublishing(true);
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
      setIsPublishing(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCollectionId) {
      return;
    }

    setIsPublishing(true);
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
      setIsPublishing(false);
    }
  }

  async function handleDeleteCollection() {
    if (!selectedCollectionId) {
      return;
    }

    setIsDeleting(true);
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

      setIsDeletePostDialogOpen(false);
      resetForCreate();
      setStatus('Collection deleted.');
      await refreshCollections(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setIsDeleting(false);
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

    setIsUploadingImages(true);
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
      setIsUploadingImages(false);
      resetPreviews();
      formRef.current?.reset();
    }
  }

  async function handleDeleteImage() {
    if (!selectedCollectionId || !imagePendingDelete) {
      return;
    }

    setIsDeleting(true);
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
      setImagePendingDelete(null);
      setStatus(`Deleted image #${imagePendingDelete.id}.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Image delete failed.',
      );
    } finally {
      setIsDeleting(false);
    }
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
    isApplyingLocation;
  const isLocationLookupBusy = isSearchingLocation || isApplyingLocation;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-heroFloat absolute -left-16 top-6 h-72 w-72 rounded-full bg-orange-300/35 blur-3xl" />
        <div className="animate-heroFloat absolute -right-16 top-24 h-80 w-80 rounded-full bg-amber-200/35 blur-3xl [animation-delay:2s]" />
        <div className="absolute bottom-8 left-1/2 h-60 w-[70%] -translate-x-1/2 rounded-full bg-orange-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-sans text-sm uppercase tracking-[0.18em] text-[--orange-7]">
              Local Admin
            </p>
            <h1 className="font-display mt-3 text-5xl font-medium leading-[0.92] text-[--orange-9] sm:text-6xl">
              Portal
            </h1>
            <p className="mt-4 text-base leading-7 text-[--orange-8] sm:text-lg">
              Create new posts, then edit or remove anything already published.
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

        <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="shadow-glow self-start rounded-[32px] border border-orange-500/15 bg-white/70 p-4 backdrop-blur-xl">
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
                      className={`w-full overflow-hidden rounded-[24px] border text-left transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 ${
                        active
                          ? 'border-orange-500/45 bg-orange-50 shadow-sm shadow-orange-200/40'
                          : 'border-orange-500/10 bg-white/75 hover:border-orange-500/25 hover:bg-white/90'
                      }`}
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.src}
                          alt={collection.title}
                          className="aspect-[4/3] w-full object-cover transition-transform duration-300 ease-out"
                        />
                      ) : null}
                      <div className="space-y-1 p-4">
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
            className="animate-panelRise shadow-glow rounded-[32px] border border-orange-500/15 bg-white/70 p-5 backdrop-blur-xl transition-[box-shadow,border-color] duration-300 ease-out sm:p-7"
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
                  onClick={() => setIsDeletePostDialogOpen(true)}
                  disabled={isBusy}
                >
                  Delete
                </Button>
              ) : null}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <section className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-2 block font-sans text-sm uppercase tracking-[0.14em] text-[--orange-7]">
                      Title
                    </span>
                    <input
                      className="w-full rounded-2xl border border-orange-500/15 bg-white px-4 py-3 text-[--orange-9] outline-none transition focus:border-orange-500/45"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
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
                      onChange={(event) => setContent(event.target.value)}
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
                      onChange={(event) => setSortOrder(event.target.value)}
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

                <div className="border-orange-500/12 rounded-[28px] border bg-orange-50/65 p-4">
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

                  <div
                    className={`grid gap-4 ${
                      mode === 'edit'
                        ? 'sm:grid-cols-2 xl:grid-cols-2'
                        : 'lg:grid-cols-2'
                    }`}
                  >
                    {mode === 'create' ? (
                      previews.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-orange-500/20 bg-white/70 p-6 text-sm text-[--orange-8]">
                          Upload images to preview them here.
                        </div>
                      ) : (
                        previews.map((preview, index) => (
                          <div
                            key={preview.id}
                            className="border-orange-500/12 hover:border-orange-500/28 group overflow-hidden rounded-[26px] border bg-white shadow-[0_14px_36px_rgba(95,44,15,0.08)] transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(95,44,15,0.14)]"
                          >
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={preview.url}
                                alt={preview.file.name}
                                className="aspect-[5/4] w-full object-cover transition duration-300 ease-out group-hover:scale-[1.02]"
                              />
                              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                                <span className="bg-white/88 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[--orange-9] shadow-sm">
                                  New {index + 1}
                                </span>
                                {coverIndex === index ? (
                                  <span className="rounded-full bg-[--orange-9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
                                    Cover
                                  </span>
                                ) : null}
                              </div>
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(60,27,8,0.8)] via-[rgba(60,27,8,0.34)] to-transparent p-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant={
                                      coverIndex === index
                                        ? 'secondary'
                                        : 'default'
                                    }
                                    size="sm"
                                    className={
                                      coverIndex === index
                                        ? 'bg-white/92 min-w-0 flex-1 px-3'
                                        : 'min-w-0 flex-1 bg-white px-3 text-[--orange-9] hover:bg-white'
                                    }
                                    onClick={() => setCoverIndex(index)}
                                    disabled={isBusy}
                                  >
                                    {coverIndex === index
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
                            </div>
                          </div>
                        ))
                      )
                    ) : selectedCollection?.images.length ? (
                      selectedCollection.images.map((image) => (
                        <div
                          key={image.id}
                          className="border-orange-500/12 hover:border-orange-500/28 group overflow-hidden rounded-[26px] border bg-white shadow-[0_14px_36px_rgba(95,44,15,0.08)] transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(95,44,15,0.14)]"
                        >
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image.src}
                              alt={selectedCollection.title}
                              className="aspect-[4/3] w-full object-cover transition duration-300 ease-out group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                              <span className="bg-white/88 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[--orange-9] shadow-sm">
                                #{image.id}
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
                                    setEditingCoverImageId(image.id)
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
                                  onClick={() => setImagePendingDelete(image)}
                                  disabled={isBusy}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
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

              <aside className="space-y-5">
                <section className="border-orange-500/12 bg-white/78 rounded-[28px] border p-5 shadow-sm">
                  <h3 className="font-display text-2xl text-[--orange-9]">
                    Location
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[--orange-8]">
                    EXIF can prefill coordinates. Search and pick a place when
                    needed.
                  </p>

                  <div className="mt-5 grid gap-4">
                    <div className="border-orange-500/12 rounded-[24px] border bg-orange-50/55 p-4">
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
                              setLocationQuery(event.target.value)
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
                          setLocation((current) => ({
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
                          setLocation((current) => ({
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
                          setLocation((current) => ({
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
                          setLocation((current) => ({
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
                          setLocation((current) => ({
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
                          setLocation((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="border-orange-500/12 rounded-[28px] border bg-[--orange-9] p-5 text-white shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-orange-200/80">
                    Status
                  </p>
                  <p className="mt-3 text-sm leading-7 text-orange-100/90">
                    {status}
                  </p>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={isBusy}
                    className="mt-6 w-full bg-white"
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
              </aside>
            </div>
          </form>
        </div>
      </div>

      <Dialog
        open={isDeletePostDialogOpen}
        onOpenChange={setIsDeletePostDialogOpen}
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
              onClick={() => setIsDeletePostDialogOpen(false)}
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
            setImagePendingDelete(null);
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
              onClick={() => setImagePendingDelete(null)}
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
