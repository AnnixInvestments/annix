import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isArray } from "es-toolkit/compat";
import type { CreateLeaveRequest, StaffLeaveRecord } from "@/app/lib/api/stock-control-api/types";
import type { StaffMember, StockControlDepartment } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useStaffMembers(params: { search?: string; active?: string }) {
  return useQuery<StaffMember[]>({
    queryKey: stockControlKeys.staff.list(params),
    queryFn: async () => {
      const data = await stockControlApiClient.staffMembers(params);
      return isArray(data) ? data : [];
    },
  });
}

export function useStaffDepartments() {
  return useQuery<StockControlDepartment[]>({
    queryKey: stockControlKeys.staff.departments(),
    queryFn: async () => {
      const data = await stockControlApiClient.departments();
      return isArray(data) ? data : [];
    },
    staleTime: 60_000,
  });
}

export function useInvalidateStaff() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.staff.all });
}

export function useLeaveRecords(year: number, month: number) {
  return useQuery<StaffLeaveRecord[]>({
    queryKey: stockControlKeys.leave.month(year, month),
    queryFn: async () => {
      const data = await stockControlApiClient.leaveRecordsForMonth(year, month);
      return isArray(data) ? data : [];
    },
  });
}

export function useCreateLeaveRecord() {
  const queryClient = useQueryClient();
  return useMutation<StaffLeaveRecord, Error, CreateLeaveRequest>({
    mutationFn: (payload: CreateLeaveRequest) => stockControlApiClient.createLeaveRecord(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.leave.all });
    },
  });
}

export function useUploadSickNote() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { recordId: number; file: File }>({
    mutationFn: (params) => stockControlApiClient.uploadSickNote(params.recordId, params.file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.leave.all });
    },
  });
}

export function useDeleteLeaveRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteLeaveRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.leave.all });
    },
  });
}

export function useAdminDeleteLeaveRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.adminDeleteLeaveRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.leave.all });
    },
  });
}

export function useSickNoteUrl() {
  return useMutation<{ url: string }, Error, number>({
    mutationFn: (recordId: number) => stockControlApiClient.sickNoteUrl(recordId),
  });
}
