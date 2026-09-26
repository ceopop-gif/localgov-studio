import { env } from "cloudflare:workers";
import { rows } from "@/db/repository";

type StoredObject = {
  body: ReadableStream;
  etag?: string;
};

type Bucket = {
  get: (key: string) => Promise<StoredObject | null>;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  try {
    const [file] = await rows("media_files", {id:`eq.${mediaId}`,limit:"1"});
    if (!file) return new Response("Not found", { status: 404 });
    const bucket = (env as unknown as { BUCKET?: Bucket }).BUCKET;
    if (!bucket) throw new Error("R2 binding BUCKET is unavailable");
    const object = await bucket.get(file.objectKey);
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers({
      "content-type": file.contentType,
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    });
    if (new URL(request.url).searchParams.get("download") === "1") {
      headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    }
    if (object.etag) headers.set("etag", object.etag);
    return new Response(object.body, { headers });
  } catch (error) {
    console.error("read media failed", error);
    return new Response("File temporarily unavailable", { status: 503 });
  }
}
