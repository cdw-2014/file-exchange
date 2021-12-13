export interface File {
  name: string;
  data: any;
  type?: "text" | "photo" | "pdf";
}

export interface Room {
  id: string;
  files: File[];
}
