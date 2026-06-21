"use client";

import { useQuery } from "@tanstack/react-query";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import type {
  BlogPostDto,
  CompoundDataSheetDto,
  TestimonialDto,
  WebsitePageDto,
} from "@/app/lib/api/auRubberApi";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";

export function useAuCmsWebsitePages() {
  return useQuery<WebsitePageDto[]>({
    queryKey: auCmsKeys.websitePages.list(),
    queryFn: () => auCmsAdminApi.websitePages(),
  });
}

export function useAuCmsWebsitePage(id: string) {
  return useQuery<WebsitePageDto>({
    queryKey: auCmsKeys.websitePages.detail(id),
    queryFn: () => auCmsAdminApi.websitePage(id),
    enabled: !!id,
  });
}

export function useAuCmsTestimonials() {
  return useQuery<TestimonialDto[]>({
    queryKey: auCmsKeys.testimonials.list(),
    queryFn: () => auCmsAdminApi.testimonials(),
  });
}

export function useAuCmsTestimonial(id: string) {
  return useQuery<TestimonialDto>({
    queryKey: auCmsKeys.testimonials.detail(id),
    queryFn: () => auCmsAdminApi.testimonial(id),
    enabled: !!id,
  });
}

export function useAuCmsBlogPosts() {
  return useQuery<BlogPostDto[]>({
    queryKey: auCmsKeys.blogPosts.list(),
    queryFn: () => auCmsAdminApi.blogPosts(),
  });
}

export function useAuCmsBlogPost(id: string) {
  return useQuery<BlogPostDto>({
    queryKey: auCmsKeys.blogPosts.detail(id),
    queryFn: () => auCmsAdminApi.blogPost(id),
    enabled: !!id,
  });
}

export function useAuCmsDataSheets() {
  return useQuery<CompoundDataSheetDto[]>({
    queryKey: auCmsKeys.dataSheets.list(),
    queryFn: () => auCmsAdminApi.dataSheets(),
  });
}

export function useAuCmsDataSheet(id: string) {
  return useQuery<CompoundDataSheetDto>({
    queryKey: auCmsKeys.dataSheets.detail(id),
    queryFn: () => auCmsAdminApi.dataSheet(id),
    enabled: !!id,
  });
}
