export interface ReportSummary {
  report_id: string;
  status: string | null;
  created_at: string;
}

export interface ReportFrame {
  frame_url: string;
  confidence: number | null;
  mask_coverage: number | null;
  location_segmented?: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  distance_median_from_reported_location?: number | null;
}

export interface ReportDetail extends ReportSummary {
  description_short?: string;
  description_synonyms?: string;
  description_full?: string;
  reported_frames?: ReportFrame[];
  location_upload?: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  duplicate_of?: string | null;
  duplicate_confidence?: number | null;
  duplicates?: string[];

}
