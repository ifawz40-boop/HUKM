export interface PdfLibraryItem {
  id: string;
  title: string;
  author: string;
  publicationYear: number;
  pageCount: number;
  description: string;
  fileUrl: string;
  sourceUrl: string;
  sourceNameAr: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  isScanned: boolean;
  searchAvailable: boolean;
}
