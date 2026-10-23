import "server-only";
import crypto from "crypto";
import { AwsClient } from "aws4fetch";

// Neon Object Storage (S3-compatible, path-style) for dictionary files.
// Objects are private; the server reads them with signed requests, and the
// browser uploads with short-lived presigned URLs. References stored in the
// database look like "s3:<key>".

function cfg() {
  const endpoint = process.env.NEON_S3_ENDPOINT;
  const bucket = process.env.NEON_S3_BUCKET;
  const accessKeyId = process.env.NEON_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEON_S3_SECRET_ACCESS_KEY;
  const region = process.env.NEON_S3_REGION ?? "ap-southeast-1";
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Object storage is not configured (NEON_S3_* environment variables).");
  }
  return { endpoint: endpoint.replace(/\/$/, ""), bucket, accessKeyId, secretAccessKey, region };
}

export const isStorageConfigured = () =>
  Boolean(process.env.NEON_S3_ENDPOINT && process.env.NEON_S3_BUCKET && process.env.NEON_S3_ACCESS_KEY_ID && process.env.NEON_S3_SECRET_ACCESS_KEY);

let client: AwsClient | null = null;
function aws() {
  const c = cfg();
  if (!client) client = new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, service: "s3", region: c.region });
  return client;
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");
export const objectUrl = (key: string) => `${cfg().endpoint}/${cfg().bucket}/${encodeKey(key)}`;
export const toRef = (key: string) => `s3:${key}`;
export const fromRef = (ref: string) => (ref.startsWith("s3:") ? ref.slice(3) : null);

async function call(url: string, init: RequestInit = {}, tries = 4): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < tries; i++) {
    const res = await aws().fetch(url, init);
    if (res.status !== 503 && res.status !== 500) return res;
    last = res;
    await new Promise((r) => setTimeout(r, 300 * 2 ** i)); // SlowDown → back off
  }
  return last!;
}

export async function getObject(key: string, start?: number, end?: number): Promise<{ buf: Buffer; partial: boolean }> {
  const headers: Record<string, string> = {};
  if (start !== undefined) headers.Range = `bytes=${start}-${end ?? ""}`;
  const res = await call(objectUrl(key), { headers });
  if (!res.ok) throw new Error(`Storage read ${key}: ${res.status}`);
  return { buf: Buffer.from(await res.arrayBuffer()), partial: res.status === 206 };
}

export async function putObject(key: string, body: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const res = await call(objectUrl(key), { method: "PUT", body: body as BodyInit, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new Error(`Storage write ${key}: ${res.status} ${await res.text()}`);
}

export async function deleteObject(key: string) {
  const res = await call(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Storage delete ${key}: ${res.status}`);
}

/** Every key under a prefix (paginated). */
export async function listKeys(prefix: string): Promise<{ key: string; size: number }[]> {
  const out: { key: string; size: number }[] = [];
  let token = "";
  do {
    const u = new URL(`${cfg().endpoint}/${cfg().bucket}`);
    u.searchParams.set("list-type", "2");
    u.searchParams.set("prefix", prefix);
    if (token) u.searchParams.set("continuation-token", token);
    const res = await call(u.toString());
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>[\s\S]*?<Key>([\s\S]*?)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g)) {
      out.push({ key: m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"), size: Number(m[2]) });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? (xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] ?? "") : "";
  } while (token);
  return out;
}

export async function deletePrefix(prefix: string) {
  const keys = await listKeys(prefix);
  for (let i = 0; i < keys.length; i += 20) await Promise.all(keys.slice(i, i + 20).map((k) => deleteObject(k.key)));
  return keys.length;
}

// ------------------------------------------------------------- presigning
async function presign(url: string, method: string, expires = 6 * 3600) {
  const u = new URL(url);
  u.searchParams.set("X-Amz-Expires", String(expires));
  const signed = await aws().sign(new Request(u.toString(), { method }), { aws: { signQuery: true } });
  return signed.url;
}

export const presignPut = (key: string) => presign(objectUrl(key), "PUT");

export async function createMultipart(key: string): Promise<string> {
  const res = await call(`${objectUrl(key)}?uploads`, { method: "POST" });
  const xml = await res.text();
  const id = xml.match(/<UploadId>([\s\S]*?)<\/UploadId>/)?.[1];
  if (!res.ok || !id) throw new Error(`Could not start upload of ${key}: ${res.status}`);
  return id;
}

export const presignPart = (key: string, uploadId: string, part: number) =>
  presign(`${objectUrl(key)}?partNumber=${part}&uploadId=${encodeURIComponent(uploadId)}`, "PUT");

export async function completeMultipart(key: string, uploadId: string, parts: { n: number; etag: string }[]) {
  const body =
    "<CompleteMultipartUpload>" +
    parts
      .sort((a, b) => a.n - b.n)
      .map((p) => `<Part><PartNumber>${p.n}</PartNumber><ETag>${p.etag.replace(/&/g, "&amp;")}</ETag></Part>`)
      .join("") +
    "</CompleteMultipartUpload>";
  const res = await call(`${objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}`, { method: "POST", body, headers: { "Content-Type": "application/xml" } });
  const text = await res.text();
  if (!res.ok || /<Error>/.test(text)) throw new Error(`Could not finish upload of ${key}: ${res.status} ${text.slice(0, 200)}`);
}

// ------------------------------------------------------------------ CORS
let corsDone = false;
/** Allow the site's own pages to upload straight to the bucket (idempotent). */
export async function ensureCors(origins: string[]) {
  if (corsDone) return;
  const xml =
    "<CORSConfiguration><CORSRule>" +
    origins.map((o) => `<AllowedOrigin>${o}</AllowedOrigin>`).join("") +
    "<AllowedMethod>PUT</AllowedMethod><AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod>" +
    "<AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader><MaxAgeSeconds>3600</MaxAgeSeconds>" +
    "</CORSRule></CORSConfiguration>";
  const md5 = crypto.createHash("md5").update(xml).digest("base64");
  const res = await call(`${cfg().endpoint}/${cfg().bucket}?cors`, {
    method: "PUT",
    body: xml,
    headers: { "Content-Type": "application/xml", "Content-MD5": md5 },
  });
  if (!res.ok) throw new Error(`Could not set storage CORS: ${res.status} ${await res.text()}`);
  corsDone = true;
}
