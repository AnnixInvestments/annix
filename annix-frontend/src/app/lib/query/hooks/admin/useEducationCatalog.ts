import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateFacultyInput,
  type CreateInstitutionInput,
  type CreateProgrammeInput,
  type EducationFaculty,
  type EducationInstitution,
  type EducationProgramme,
  type EducationScholarship,
  educationCatalogAdminApi,
  type ScholarshipInput,
  type UpdateInstitutionInput,
  type UpdateProgrammeInput,
} from "@/app/lib/api/educationCatalogAdminApi";

const educationCatalogKeys = {
  all: ["admin", "educationCatalog"] as const,
  institutions: () => [...educationCatalogKeys.all, "institutions"] as const,
  faculties: (institutionId: string) =>
    [...educationCatalogKeys.all, "faculties", institutionId] as const,
  programmes: (institutionId: string) =>
    [...educationCatalogKeys.all, "programmes", institutionId] as const,
  scholarships: () => [...educationCatalogKeys.all, "scholarships"] as const,
};

export function useEducationInstitutions() {
  return useQuery<EducationInstitution[]>({
    queryKey: educationCatalogKeys.institutions(),
    queryFn: () => educationCatalogAdminApi.institutions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEducationInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInstitutionInput) =>
      educationCatalogAdminApi.createInstitution(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationCatalogKeys.institutions() });
    },
  });
}

export function useUpdateEducationInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInstitutionInput }) =>
      educationCatalogAdminApi.updateInstitution(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationCatalogKeys.institutions() });
    },
  });
}

export function useEducationFaculties(institutionId: string | null) {
  const enabled = Boolean(institutionId);
  const id = institutionId || "";
  return useQuery<EducationFaculty[]>({
    queryKey: educationCatalogKeys.faculties(id),
    queryFn: () => educationCatalogAdminApi.faculties(id),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEducationFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFacultyInput) => educationCatalogAdminApi.createFaculty(input),
    onSuccess: (faculty) => {
      queryClient.invalidateQueries({
        queryKey: educationCatalogKeys.faculties(faculty.institutionId),
      });
    },
  });
}

export function useEducationProgrammes(institutionId: string | null) {
  const enabled = Boolean(institutionId);
  const id = institutionId || "";
  return useQuery<EducationProgramme[]>({
    queryKey: educationCatalogKeys.programmes(id),
    queryFn: () => educationCatalogAdminApi.programmes(id),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEducationProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProgrammeInput) => educationCatalogAdminApi.createProgramme(input),
    onSuccess: (programme) => {
      queryClient.invalidateQueries({
        queryKey: educationCatalogKeys.programmes(programme.institutionId),
      });
    },
  });
}

export function useUpdateEducationProgramme(institutionId: string | null) {
  const queryClient = useQueryClient();
  const id = institutionId || "";
  return useMutation({
    mutationFn: ({ programmeId, input }: { programmeId: string; input: UpdateProgrammeInput }) =>
      educationCatalogAdminApi.updateProgramme(programmeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationCatalogKeys.programmes(id) });
    },
  });
}

export function useEducationScholarships() {
  return useQuery<EducationScholarship[]>({
    queryKey: educationCatalogKeys.scholarships(),
    queryFn: () => educationCatalogAdminApi.scholarships(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEducationScholarship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScholarshipInput) => educationCatalogAdminApi.createScholarship(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationCatalogKeys.scholarships() });
    },
  });
}

export function useUpdateEducationScholarship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ScholarshipInput }) =>
      educationCatalogAdminApi.updateScholarship(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationCatalogKeys.scholarships() });
    },
  });
}
