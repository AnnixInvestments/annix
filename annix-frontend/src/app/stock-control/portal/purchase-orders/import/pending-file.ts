let pendingFile: File | null = null;

export function setPendingCpoImportFile(file: File | null) {
  pendingFile = file;
}

export function consumePendingCpoImportFile(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}
