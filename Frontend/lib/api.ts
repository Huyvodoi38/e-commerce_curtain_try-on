/**
 * Wrapper gọi API backend FastAPI.
 * Mọi request phía client/server đều đi qua đây để dễ thay đổi base URL.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  currency: string;
  category_slug?: string | null;
  images: string[];
  thumbnail?: string | null;
  in_stock: boolean;
  ai_prompt: string;
  ai_negative_prompt: string;
}

/** Lấy danh sách sản phẩm rèm. */
export async function fetchProducts(params?: {
  skip?: number;
  limit?: number;
  category_slug?: string;
}): Promise<Product[]> {
  const search = new URLSearchParams();
  if (params?.skip !== undefined) search.set("skip", String(params.skip));
  if (params?.limit !== undefined) search.set("limit", String(params.limit));
  if (params?.category_slug) search.set("category_slug", params.category_slug);

  const url = `${API_BASE_URL}/products${
    search.toString() ? `?${search.toString()}` : ""
  }`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Không lấy được danh sách sản phẩm: ${res.status}`);
  }
  return res.json();
}

/** Lấy chi tiết 1 sản phẩm. */
export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Không tìm thấy sản phẩm ${id}`);
  }
  return res.json();
}

export interface TryOnParams {
  image: File;
  productId?: string;
  prompt?: string;
  negativePrompt?: string;
  bbox?: { xMin: number; yMin: number; xMax: number; yMax: number };
  expansion?: number;
  controlScale?: number;
  processRes?: number;
}

/**
 * Gọi endpoint /ai/tryon. Trả về Blob ảnh PNG để hiển thị tại client.
 * Lưu ý: hàm này chỉ chạy ở phía client (trong React Component).
 */
export async function runTryOn(params: TryOnParams): Promise<Blob> {
  const formData = new FormData();
  formData.append("image", params.image);

  if (params.productId) formData.append("product_id", params.productId);
  if (params.prompt) formData.append("prompt", params.prompt);
  if (params.negativePrompt)
    formData.append("negative_prompt", params.negativePrompt);

  if (params.bbox) {
    formData.append("x_min", String(params.bbox.xMin));
    formData.append("y_min", String(params.bbox.yMin));
    formData.append("x_max", String(params.bbox.xMax));
    formData.append("y_max", String(params.bbox.yMax));
  }
  if (params.expansion !== undefined)
    formData.append("expansion", String(params.expansion));
  if (params.controlScale !== undefined)
    formData.append("control_scale", String(params.controlScale));
  if (params.processRes !== undefined)
    formData.append("process_res", String(params.processRes));

  const res = await fetch(`${API_BASE_URL}/ai/tryon`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Try-on thất bại (${res.status}): ${text}`);
  }
  return res.blob();
}
