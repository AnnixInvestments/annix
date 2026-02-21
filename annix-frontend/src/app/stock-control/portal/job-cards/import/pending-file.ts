let pendingFile: File | null = null;

export function setPendingImportFile(file: File | null) {
  pendingFile = file;
}

export function consumePendingImportFile(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}
