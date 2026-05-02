# File Storage Architecture

- **Default storage**: S3 (AWS) - files persist across deployments
- **Local storage**: Deprecated, only for development - files lost on redeploy
- **Storage abstraction**: `IStorageService` interface in `annix-backend/src/storage/`
- **Configuration**: `STORAGE_TYPE=s3` (default) or `STORAGE_TYPE=local`

## S3 Bucket Structure
All files are stored in a single bucket with area-based prefixes:
```
annix-sync-files/
├── annix-app/           # Core app documents (customers, suppliers, RFQ, drawings)
├── au-rubber/           # AU Rubber documents (CoCs, delivery notes, graphs)
├── fieldflow/           # FieldFlow recordings
├── cv-assistant/        # CV Assistant candidate documents
├── stock-control/       # Stock Control documents (job cards, invoices, signatures)
└── secure-documents/    # Encrypted secure documents
```

## Storage Service Usage
```typescript
// Inject storage service
constructor(@Inject(STORAGE_SERVICE) private storageService: IStorageService) {}

// Upload with area prefix
const result = await this.storageService.upload(file, `${StorageArea.ANNIX_APP}/customers/${customerId}/documents`);

// Download
const buffer = await this.storageService.download(filePath);

// Generate presigned URL (1 hour default)
const url = await this.storageService.presignedUrl(filePath, 3600);
```

## Key Files
- `annix-backend/src/storage/storage.interface.ts` - IStorageService interface, StorageArea enum
- `annix-backend/src/storage/s3-storage.service.ts` - S3 implementation
- `annix-backend/src/storage/local-storage.service.ts` - Local filesystem (deprecated)
- `annix-backend/docs/AWS_S3_SETUP_GUIDE.md` - AWS setup instructions
- `annix-backend/scripts/deploy-s3-storage.sh` - Deployment automation

## Workflow SVG Lines (WorkflowStatus.tsx) — niche reference
- **Custom step key prefix**: Companies can have steps with a `custom_` prefix (e.g. `custom_reception` instead of `reception`). When querying DOM nodes by `data-bg-step`, always check both `stepKey` and `custom_${stepKey}` variants
- **SVG path rendering**: The main `computePaths` useEffect draws branch lines via `setSvgPaths` state. Adding new overlay lines (like the req-bypass line) should use a **separate SVG element with direct DOM manipulation** (`pathEl.setAttribute("d", ...)`) via its own useEffect — NOT through the main `computePaths` flow. The main flow has timing issues where rapid parent re-renders cancel rAF/setTimeout callbacks before they fire
- **MutationObserver for deferred nodes**: Background step nodes render inside conditionally-positioned branch rows. Use `MutationObserver` + `ResizeObserver` to detect when nodes appear/move, since they may not exist when the effect first runs
- **Key file**: `annix-frontend/src/app/stock-control/components/WorkflowStatus.tsx`
