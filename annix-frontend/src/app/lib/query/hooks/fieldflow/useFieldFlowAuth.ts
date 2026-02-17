import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FieldFlowLoginDto,
  FieldFlowRegisterDto,
  fieldflowAuthApi,
} from "../../../api/fieldflowAuthApi";
import { fieldflowKeys } from "../../keys/fieldflowKeys";

export function useFieldFlowRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: FieldFlowRegisterDto) => fieldflowAuthApi.register(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.all });
    },
  });
}

export function useFieldFlowLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: FieldFlowLoginDto) => fieldflowAuthApi.login(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.all });
    },
  });
}

export function useFieldFlowLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => fieldflowAuthApi.logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.all });
      queryClient.clear();
    },
  });
}

export function useFieldFlowCheckEmail() {
  return useMutation({
    mutationFn: (email: string) => fieldflowAuthApi.checkEmailAvailable(email),
  });
}
