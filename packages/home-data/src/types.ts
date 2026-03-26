export interface UploadedImageInput {
  name: string;
  type: string;
  buffer: Buffer;
}

export interface LocationDraft {
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  country: string;
  region: string;
  description: string;
  source: 'manual' | 'exif+google' | 'none';
}

export interface PublishCollectionInput {
  title: string;
  content?: string;
  sortOrder?: number | null;
  coverIndex?: number;
  images: UploadedImageInput[];
  location?: Partial<LocationDraft>;
}

export interface PublishCollectionResult {
  collectionId: number;
  coverImageId: number | null;
  uploadedCount: number;
  imageUrls: string[];
  location: LocationDraft | null;
}

export interface AdminCollectionImage {
  id: number;
  src: string;
  width: number | null;
  height: number | null;
}

export interface AdminCollectionRecord {
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
  images: AdminCollectionImage[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCollectionInput {
  collectionId: number;
  title: string;
  content?: string;
  sortOrder?: number | null;
  coverImageId?: number | null;
  location?: Partial<LocationDraft>;
}
