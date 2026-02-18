import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AnnixRepLoginDto,
  AnnixRepRegisterDto,
  annixRepAuthApi,
} from "../../../api/annixRepAuthApi";
import { annixRepKeys } from "../../keys/annixRepKeys";

export function useAnnixRepRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AnnixRepRegisterDto) => annixRepAuthApi.register(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.all });
    },
  });
}

export function useAnnixRepLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AnnixRepLoginDto) => annixRepAuthApi.login(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.all });
    },
  });
}

export function useAnnixRepLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => annixRepAuthApi.logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.all });
      queryClient.clear();
    },
  });
}

export function useAnnixRepCheckEmail() {
  return useMutation({
    mutationFn: (email: string) => annixRepAuthApi.checkEmailAvailable(email),
  });
}
