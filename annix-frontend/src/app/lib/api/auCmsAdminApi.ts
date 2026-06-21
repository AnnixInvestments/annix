import type { CmsBlock } from "@annix/product-data/cms";
import { toPairs as entries } from "es-toolkit/compat";
import { type ApiClient, createApiClient, createEndpoint } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";
import type {
  BlogPostDto,
  CompoundDataSheetDto,
  CreateBlogPostDto,
  CreateCompoundDataSheetDto,
  CreateTestimonialDto,
  CreateWebsitePageDto,
  TestimonialDto,
  UpdateBlogPostDto,
  UpdateCompoundDataSheetDto,
  UpdateTestimonialDto,
  UpdateWebsitePageDto,
  WebsitePageDto,
} from "./auRubberApi";

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class AuCmsAdminApiClient {
  baseURL = API_BASE_URL;

  protected request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return apiClient.request<T>(endpoint, options);
  }

  protected requestWithFiles<T>(
    endpoint: string,
    files: File[],
    data?: Record<string, string | number | undefined>,
    fieldName: string = "files",
  ): Promise<T> {
    const formData = new FormData();
    files.forEach((file) => formData.append(fieldName, file));
    if (data) {
      entries(data).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, String(value));
      });
    }
    return apiClient.request<T>(endpoint, { method: "POST", body: formData });
  }

  websitePages = createEndpoint<[], WebsitePageDto[]>(apiClient, "GET", {
    path: "/rubber-lining/website-pages",
  });

  websitePage = createEndpoint<[id: string], WebsitePageDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/website-pages/${id}`,
  });

  createWebsitePage = createEndpoint<[data: CreateWebsitePageDto], WebsitePageDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/website-pages",
      body: (data) => data,
    },
  );

  updateWebsitePage = createEndpoint<[id: string, data: UpdateWebsitePageDto], WebsitePageDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/website-pages/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteWebsitePage(id: string): Promise<void> {
    return this.request(`/rubber-lining/website-pages/${id}`, {
      method: "DELETE",
    });
  }

  reorderWebsitePage = createEndpoint<[id: string, sortOrder: number], WebsitePageDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _sortOrder) => `/rubber-lining/website-pages/${id}/reorder`,
      body: (_id, sortOrder) => ({ sortOrder }),
    },
  );

  async uploadWebsiteImage(file: File): Promise<{ url: string }> {
    return this.requestWithFiles("/rubber-lining/website-pages/upload-image", [file], {}, "file");
  }

  saveWebsiteDraftBlocks = createEndpoint<[id: string, blocks: CmsBlock[]], WebsitePageDto>(
    apiClient,
    "PUT",
    {
      path: (id, _blocks) => `/rubber-lining/website-pages/${id}/blocks/draft`,
      body: (_id, blocks) => ({ blocks }),
    },
  );

  publishWebsiteBlocks = createEndpoint<[id: string], WebsitePageDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/website-pages/${id}/blocks/publish`,
  });

  discardWebsiteBlocks = createEndpoint<[id: string], WebsitePageDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/website-pages/${id}/blocks/discard`,
  });

  testimonials = createEndpoint<[], TestimonialDto[]>(apiClient, "GET", {
    path: "/rubber-lining/testimonials",
  });

  testimonial = createEndpoint<[id: string], TestimonialDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/testimonials/${id}`,
  });

  createTestimonial = createEndpoint<[data: CreateTestimonialDto], TestimonialDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/testimonials",
      body: (data) => data,
    },
  );

  updateTestimonial = createEndpoint<[id: string, data: UpdateTestimonialDto], TestimonialDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/testimonials/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteTestimonial(id: string): Promise<void> {
    return this.request(`/rubber-lining/testimonials/${id}`, {
      method: "DELETE",
    });
  }

  blogPosts = createEndpoint<[], BlogPostDto[]>(apiClient, "GET", {
    path: "/rubber-lining/blog-posts",
  });

  blogPost = createEndpoint<[id: string], BlogPostDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/blog-posts/${id}`,
  });

  createBlogPost = createEndpoint<[data: CreateBlogPostDto], BlogPostDto>(apiClient, "POST", {
    path: "/rubber-lining/blog-posts",
    body: (data) => data,
  });

  updateBlogPost = createEndpoint<[id: string, data: UpdateBlogPostDto], BlogPostDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/blog-posts/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteBlogPost(id: string): Promise<void> {
    return this.request(`/rubber-lining/blog-posts/${id}`, {
      method: "DELETE",
    });
  }

  dataSheets = createEndpoint<[], CompoundDataSheetDto[]>(apiClient, "GET", {
    path: "/rubber-lining/data-sheets",
  });

  dataSheet = createEndpoint<[id: string], CompoundDataSheetDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/data-sheets/${id}`,
  });

  createDataSheet = createEndpoint<[data: CreateCompoundDataSheetDto], CompoundDataSheetDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/data-sheets",
      body: (data) => data,
    },
  );

  updateDataSheet = createEndpoint<
    [id: string, data: UpdateCompoundDataSheetDto],
    CompoundDataSheetDto
  >(apiClient, "PATCH", {
    path: (id, _data) => `/rubber-lining/data-sheets/${id}`,
    body: (_id, data) => data,
  });

  async deleteDataSheet(id: string): Promise<void> {
    return this.request(`/rubber-lining/data-sheets/${id}`, {
      method: "DELETE",
    });
  }

  async uploadDataSheetPdf(file: File): Promise<{ url: string }> {
    return this.requestWithFiles("/rubber-lining/data-sheets/upload-pdf", [file], {}, "file");
  }
}

export const auCmsAdminApi = new AuCmsAdminApiClient();
