import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
import { minioClient } from "./minio";
import { env } from "./env";
import { db } from "./db";

function sanitizeText(value?: string): string {
  return (value ?? "").replace(/[<>&'"]/g, (char) => {
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "&") return "&amp;";
    if (char === "'") return "&apos;";
    return "&quot;";
  });
}

function normalizePrefix(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function formatTimestampForFile(date: Date): string {
  const brDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const year = brDate.getFullYear();
  const month = String(brDate.getMonth() + 1).padStart(2, "0");
  const day = String(brDate.getDate()).padStart(2, "0");
  const hour = String(brDate.getHours()).padStart(2, "0");
  const minute = String(brDate.getMinutes()).padStart(2, "0");
  const second = String(brDate.getSeconds()).padStart(2, "0");
  const millis = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${year}${month}${day}_${hour}${minute}${second}_${millis}`;
}

function formatCapturedAtBrasilia(date: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")} BRT`;
}

function normalizeIp(value?: string): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  if (!first) return null;
  const withoutMappedPrefix = first.replace(/^::ffff:/, "");
  return withoutMappedPrefix === "::1" ? "127.0.0.1" : withoutMappedPrefix;
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1] ?? "");
    if (Number.isFinite(second) && second >= 16 && second <= 31) return true;
  }
  return false;
}

type IpGeoLookupResult = {
  publicIp: string | null;
  latitude?: number;
  longitude?: number;
  coarseAddress?: string;
};

async function fetchPublicIp(): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(env.PUBLIC_IP_LOOKUP_URL, {
      headers: { Accept: "application/json", "User-Agent": env.REVERSE_GEOCODE_USER_AGENT },
      signal: controller.signal
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { ip?: string };
    return normalizeIp(json.ip) ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function geolocateByIp(ip: string): Promise<IpGeoLookupResult> {
  if (env.IP_GEOLOOKUP_ENABLED !== "true") {
    return { publicIp: ip };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  const endpoint = env.IP_GEOLOOKUP_URL_TEMPLATE.replace("{ip}", encodeURIComponent(ip));

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": env.REVERSE_GEOCODE_USER_AGENT },
      signal: controller.signal
    });
    if (!response.ok) return { publicIp: ip };

    const json = (await response.json()) as {
      status?: string;
      query?: string;
      lat?: number;
      lon?: number;
      city?: string;
      regionName?: string;
      country?: string;
    };

    if (json.status && json.status !== "success") {
      return { publicIp: ip };
    }

    const parts = [json.city, json.regionName, json.country].filter((part): part is string => Boolean(part && part.trim()));
    return {
      publicIp: normalizeIp(json.query) ?? ip,
      latitude: typeof json.lat === "number" ? json.lat : undefined,
      longitude: typeof json.lon === "number" ? json.lon : undefined,
      coarseAddress: parts.length ? parts.join(" - ") : undefined
    };
  } catch {
    return { publicIp: ip };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveAddress(latitude?: number, longitude?: number): Promise<string | null> {
  if (env.REVERSE_GEOCODE_ENABLED !== "true") return null;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  const endpoint = new URL(env.REVERSE_GEOCODE_URL);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("lat", String(latitude));
  endpoint.searchParams.set("lon", String(longitude));
  endpoint.searchParams.set("zoom", "18");
  endpoint.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": env.REVERSE_GEOCODE_USER_AGENT,
        Accept: "application/json"
      },
      signal: controller.signal
    });
    if (!response.ok) return null;

    const json = (await response.json()) as { display_name?: string };
    if (!json.display_name) return null;
    return json.display_name.slice(0, 180);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function saveSignature(input: {
  signatoryId: string;
  documentId: string;
  type: "drawn" | "typed";
  imageBase64: string;
  text?: string;
  ip?: string;
  latitude?: number;
  longitude?: number;
  userAgent?: string;
}): Promise<{
  id: string;
  path: string;
  type: "drawn" | "typed";
  hash: string;
  documentId: string;
  signatoryId: string;
  ip: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  capturedAt: string;
  capturedAtUtc: string;
  userAgent: string | null;
}> {
  const providedIp = normalizeIp(input.ip) ?? null;
  let effectiveIp = providedIp;
  let effectiveLatitude = input.latitude;
  let effectiveLongitude = input.longitude;
  let fallbackAddress: string | undefined;

  // If caller does not provide a public IP or coordinates, enrich by IP geolocation.
  if (!effectiveIp || isPrivateOrLocalIp(effectiveIp) || typeof effectiveLatitude !== "number" || typeof effectiveLongitude !== "number") {
    let ipForLookup = effectiveIp;
    if (!ipForLookup || isPrivateOrLocalIp(ipForLookup)) {
      ipForLookup = await fetchPublicIp();
    }
    if (ipForLookup) {
      const geo = await geolocateByIp(ipForLookup);
      effectiveIp = geo.publicIp ?? effectiveIp;
      if (typeof effectiveLatitude !== "number" && typeof geo.latitude === "number") effectiveLatitude = geo.latitude;
      if (typeof effectiveLongitude !== "number" && typeof geo.longitude === "number") effectiveLongitude = geo.longitude;
      fallbackAddress = geo.coarseAddress;
    }
  }

  const rawBuffer =
    input.type === "typed"
      ? await sharp({
          text: {
            text: input.text ?? "",
            width: 900,
            height: 260,
            rgba: true
          }
        })
          .png()
          .toBuffer()
      : Buffer.from(input.imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");

  const assinaturaBase = await sharp(rawBuffer)
    .resize(1180, 540, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();

  const assinaturaMeta = await sharp(assinaturaBase).metadata();
  const assinaturaLargura = assinaturaMeta.width ?? 980;
  const assinaturaAltura = assinaturaMeta.height ?? 280;
  const margemHorizontal = 36;
  const margemSuperior = 26;
  const alturaRodape = 122;
  const canvasLargura = assinaturaLargura + margemHorizontal * 2;
  const canvasAltura = assinaturaAltura + margemSuperior * 2 + alturaRodape;

  const shadowLayer = await sharp(assinaturaBase)
    .tint({ r: 22, g: 34, b: 55 })
    .blur(1.4)
    .png()
    .toBuffer();

  const now = new Date();
  const capturedAtUtc = now.toISOString();
  const capturedAtBrasilia = formatCapturedAtBrasilia(now);
  const resolvedAddress = (await resolveAddress(effectiveLatitude, effectiveLongitude)) ?? fallbackAddress ?? null;
  const linhaMeta = [
    `ip: ${effectiveIp ?? "nao informado"}`,
    `lat: ${typeof effectiveLatitude === "number" ? effectiveLatitude.toFixed(6) : "nao informado"}`,
    `long: ${typeof effectiveLongitude === "number" ? effectiveLongitude.toFixed(6) : "nao informado"}`
  ].join(" | ");
  const linhaEndereco = `endereco: ${resolvedAddress ?? "nao informado"}`;
  const linhaDataHora = `capturado_em: ${capturedAtBrasilia}`;
  const agenteResumido = (input.userAgent ?? "nao informado").slice(0, 120);
  const overlaySvg = `
    <svg width="${canvasLargura}" height="${canvasAltura}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${canvasAltura - alturaRodape}" width="${canvasLargura}" height="${alturaRodape}" fill="rgba(8,20,40,0.10)" />
      <text x="24" y="${canvasAltura - 84}" fill="#1f3556" font-size="13" font-family="DejaVu Sans, Arial, sans-serif">
        ${sanitizeText(linhaMeta)}
      </text>
      <text x="24" y="${canvasAltura - 62}" fill="#1f3556" font-size="13" font-family="DejaVu Sans, Arial, sans-serif">
        ${sanitizeText(linhaDataHora)}
      </text>
      <text x="24" y="${canvasAltura - 40}" fill="#1f3556" font-size="12" font-family="DejaVu Sans, Arial, sans-serif">
        ${sanitizeText(linhaEndereco)}
      </text>
      <text x="24" y="${canvasAltura - 18}" fill="#516b91" font-size="11" font-family="DejaVu Sans, Arial, sans-serif">
        ${sanitizeText(`user_agent: ${agenteResumido}`)}
      </text>
    </svg>
  `;

  const finalImage = await sharp({
    create: {
      width: canvasLargura,
      height: canvasAltura,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      { input: shadowLayer, left: margemHorizontal + 2, top: margemSuperior + 3 },
      { input: assinaturaBase, left: margemHorizontal, top: margemSuperior },
      { input: Buffer.from(overlaySvg), left: 0, top: 0 }
    ])
    .png()
    .toBuffer();

  const hash = createHash("sha256").update(finalImage).digest("hex");
  const timestampFile = formatTimestampForFile(now);
  const assinaturasPrefix = normalizePrefix(env.ASSINATURAS_PREFIX || "assinatura");
  const objectPath = `${assinaturasPrefix}/assinatura_${timestampFile}_${randomUUID()}.png`;

  await minioClient.putObject(env.BUCKET_ASSINATURAS, objectPath, finalImage, finalImage.length, {
    "Content-Type": "image/png",
    "x-amz-meta-document-id": input.documentId,
    "x-amz-meta-signatory-id": input.signatoryId,
    "x-amz-meta-hash": hash,
    "x-amz-meta-ip": effectiveIp ?? "",
    "x-amz-meta-latitude": String(effectiveLatitude ?? ""),
    "x-amz-meta-longitude": String(effectiveLongitude ?? ""),
    "x-amz-meta-signature-type": input.type,
    "x-amz-meta-identification-footer": "true",
    "x-amz-meta-user-agent": input.userAgent ?? "",
    "x-amz-meta-captured-at": capturedAtBrasilia,
    "x-amz-meta-captured-at-utc": capturedAtUtc
  });

  const { rows } = await db.query(
    `INSERT INTO assinaturas (document_id, signatory_id, type, image_path, image_path_sem_marca, image_path_com_marca, hash, ip, user_agent, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      input.documentId,
      input.signatoryId,
      input.type,
      objectPath,
      objectPath,
      objectPath,
      hash,
      effectiveIp ?? null,
      input.userAgent ?? null,
      effectiveLatitude ?? null,
      effectiveLongitude ?? null
    ]
  );

  await db.query(
    `INSERT INTO logs_auditoria (event, document_id, signatory_id, ip, user_agent, payload_hash, metadata_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.type === "drawn" ? "signature.drawn.created" : "signature.typed.created",
      input.documentId,
      input.signatoryId,
      effectiveIp ?? null,
      input.userAgent ?? null,
      hash,
      JSON.stringify({
        source: "ms-assinatura",
        address: resolvedAddress ?? null,
        capturedAtBrasilia,
        capturedAtUtc
      })
    ]
  );

  return {
    id: rows[0].id,
    path: objectPath,
    type: input.type,
    hash,
    documentId: input.documentId,
    signatoryId: input.signatoryId,
    ip: effectiveIp ?? null,
    latitude: effectiveLatitude ?? null,
    longitude: effectiveLongitude ?? null,
    address: resolvedAddress ?? null,
    capturedAt: capturedAtBrasilia,
    capturedAtUtc: capturedAtUtc,
    userAgent: input.userAgent ?? null
  };
}
