export type { PendingAction, SyncMeta } from "./indexedDb";
export {
  addPendingAction,
  clearAllOfflineData,
  clearStore,
  offlineMeeting,
  offlineMeetings,
  offlineProspect,
  offlineProspects,
  offlineVisits,
  openDatabase,
  pendingActionCount,
  pendingActions,
  removePendingAction,
  saveMeetings,
  saveProspects,
  saveVisits,
  syncMeta,
  updateSyncMeta,
} from "./indexedDb";
export type { SyncStatus } from "./syncManager";
export {
  currentSyncStatus,
  lastSyncTime,
  onSyncStatusChange,
  queueOfflineAction,
  startBackgroundSync,
  stopBackgroundSync,
  syncAllToOffline,
  syncMeetingsToOffline,
  syncPendingActions,
  syncProspectsToOffline,
  syncVisitsToOffline,
} from "./syncManager";
