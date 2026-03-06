import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
import { db } from "./db";
import { env } from "./env";
import { minioClient } from "./minio";
import { validateDocumentRealtime } from "./validator";

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
  const url = new URL(env.REVERSE_GEOCODE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url, {
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

export async function uploadDocument(input: {
  signatoryId: string;
  documentId: string;
  imageBase64: string;
  type: "rg" | "cnh" | "cnh_digital" | "passport";
  side: "front" | "back" | "single";
  ip?: string;
  latitude?: number;
  longitude?: number;
  userAgent?: string;
}): Promise<{ id: string; path: string; validation: unknown }> {
  let validation: unknown = null;
  try {
    validation = await validateDocumentRealtime(input.imageBase64, input.type, input.side);
  } catch { /* validator offline — proceed */ }

  const providedIp = normalizeIp(input.ip) ?? null;
  let effectiveIp = providedIp;
  let effectiveLatitude = input.latitude;
  let effectiveLongitude = input.longitude;
  let fallbackAddress: string | undefined;

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

  const source = Buffer.from(input.imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const documentBase = await sharp(source)
    .resize(1280, 1920, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();

  const documentMeta = await sharp(documentBase).metadata();
  const documentWidth = documentMeta.width ?? 1280;
  const documentHeight = documentMeta.height ?? 1920;
  const paddingHorizontal = 0;
  const paddingTop = 0;
  const footerHeight = 122;
  const canvasWidth = documentWidth + paddingHorizontal * 2;
  const canvasHeight = documentHeight + paddingTop + footerHeight;

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
    <svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${canvasHeight - footerHeight}" width="${canvasWidth}" height="${footerHeight}" fill="rgba(8,20,40,0.10)" />
      <text x="24" y="${canvasHeight - 84}" fill="#1f3556" font-size="13" font-family="DejaVu Sans, Arial, sans-serif">
        ${sanitizeText(linhaMeta)}
      </text>
      <text x="24" y="${canvasHeight - 62}" fill="#1f3556" font-size="13" font-family="DejaVu Sans, Arial, sans-serif">
        ${sanitizeText(linhaDataHora)}
      </text>
      <text x="24" y="${canvasHeight - 40}" fill="#1f3556" font-size="12" font-family="DejaVu Sans, Arial, sans-serif">
        ${sanitizeText(linhaEndereco)}
      </text>
      <text x="24" y="${canvasHeight - 18}" fill="#516b91" font-size="11" font-family="DejaVu Sans, Arial, sans-serif">
        ${sanitizeText(`user_agent: ${agenteResumido}`)}
      </text>
    </svg>
  `;

  const finalImage = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      { input: documentBase, left: paddingHorizontal, top: paddingTop },
      { input: Buffer.from(overlaySvg), left: 0, top: 0 }
    ])
    .png()
    .toBuffer();

  const hash = createHash("sha256").update(finalImage).digest("hex");
  const timestampFile = formatTimestampForFile(now);
  const prefix = normalizePrefix(env.DOCUMENTOS_PREFIX || "documento");
  const objectPath = `${prefix}/${input.type}_${input.side}_${timestampFile}_${randomUUID()}.png`;

  await minioClient.putObject(env.BUCKET_DOCUMENTOS, objectPath, finalImage, finalImage.length, {
    "Content-Type": "image/png",
    "x-amz-meta-signatory-id": input.signatoryId,
    "x-amz-meta-document-id": input.documentId,
    "x-amz-meta-doc-type": input.type,
    "x-amz-meta-side": input.side,
    "x-amz-meta-hash": hash,
    "x-amz-meta-ip": effectiveIp ?? "",
    "x-amz-meta-latitude": String(effectiveLatitude ?? ""),
    "x-amz-meta-longitude": String(effectiveLongitude ?? ""),
    "x-amz-meta-identification-footer": "true",
    "x-amz-meta-user-agent": input.userAgent ?? "",
    "x-amz-meta-captured-at": capturedAtBrasilia,
    "x-amz-meta-captured-at-utc": capturedAtUtc
  });

  const { rows } = await db.query(
    `INSERT INTO documentos_signatario (document_id, signatory_id, doc_type, side, file_path, file_hash, ip, user_agent, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      input.documentId,
      input.signatoryId,
      input.type,
      input.side,
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
      "document.uploaded",
      input.documentId,
      input.signatoryId,
      effectiveIp ?? null,
      input.userAgent ?? null,
      hash,
      JSON.stringify({
        source: "ms-documento",
        validation,
        address: resolvedAddress ?? null,
        capturedAtBrasilia,
        capturedAtUtc
      })
    ]
  );

  return { id: rows[0].id, path: objectPath, validation };
}

export async function uploadDocumentCombinado(input: {
  signatoryId: string;
  documentId: string;
  imageFrenteBase64: string;
  imageVersoBase64?: string;
  type: "rg" | "cnh" | "cnh_digital" | "passport";
  ip?: string;
  latitude?: number;
  longitude?: number;
  userAgent?: string;
}): Promise<{
  id: string;
  path: string;
  paths: {
    principal: string;
    frente: string | null;
    verso: string | null;
  };
  type: string;
  hasVerso: boolean;
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
  validation: unknown;
}> {
  let validationFrente: unknown = null;
  try {
    validationFrente = await validateDocumentRealtime(input.imageFrenteBase64, input.type, "front");
  } catch { /* validator offline — proceed */ }

  let validationVerso: unknown = null;
  if (input.imageVersoBase64) {
    try {
      validationVerso = await validateDocumentRealtime(input.imageVersoBase64, input.type, "back");
    } catch { /* validator offline — proceed */ }
  }

  const providedIp = normalizeIp(input.ip) ?? null;
  let effectiveIp = providedIp;
  let effectiveLatitude = input.latitude;
  let effectiveLongitude = input.longitude;
  let fallbackAddress: string | undefined;

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

  const sourceFrente = Buffer.from(input.imageFrenteBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const frenteBase = await sharp(sourceFrente)
    .resize(1280, 960, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();
  const frenteMeta = await sharp(frenteBase).metadata();
  const frenteW = frenteMeta.width ?? 1280;
  const frenteH = frenteMeta.height ?? 720;

  let versoBase: Buffer | null = null;
  let versoW = 0;
  let versoH = 0;
  if (input.imageVersoBase64) {
    const sourceVerso = Buffer.from(input.imageVersoBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    versoBase = await sharp(sourceVerso)
      .resize(1280, 960, { fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .png()
      .toBuffer();
    const versoMeta = await sharp(versoBase).metadata();
    versoW = versoMeta.width ?? 1280;
    versoH = versoMeta.height ?? 720;
  }

  const labelHeight = 44;
  const separatorHeight = 8;
  const footerHeight = 122;
  const canvasW = Math.max(frenteW, versoW, 800);
  let canvasH = labelHeight + frenteH;
  if (versoBase) {
    canvasH += separatorHeight + labelHeight + versoH;
  }
  canvasH += footerHeight;

  const versoSectionTop = labelHeight + frenteH + separatorHeight;

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

  const versoLabelSvg = versoBase
    ? `<rect x="0" y="${labelHeight + frenteH}" width="${canvasW}" height="${separatorHeight}" fill="#0f2542" />
      <rect x="0" y="${versoSectionTop}" width="${canvasW}" height="${labelHeight}" fill="rgba(12,30,60,0.88)" />
      <text x="24" y="${versoSectionTop + 30}" fill="#46d6f4" font-size="18" font-weight="bold" font-family="DejaVu Sans, Arial, sans-serif">VERSO — ${sanitizeText(input.type.toUpperCase())}</text>`
    : "";

  const overlaySvg = `
    <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${canvasW}" height="${labelHeight}" fill="rgba(12,30,60,0.88)" />
      <text x="24" y="30" fill="#46d6f4" font-size="18" font-weight="bold" font-family="DejaVu Sans, Arial, sans-serif">FRENTE — ${sanitizeText(input.type.toUpperCase())}</text>
      ${versoLabelSvg}
      <rect x="0" y="${canvasH - footerHeight}" width="${canvasW}" height="${footerHeight}" fill="rgba(8,20,40,0.10)" />
      <text x="24" y="${canvasH - 84}" fill="#1f3556" font-size="13" font-family="DejaVu Sans, Arial, sans-serif">${sanitizeText(linhaMeta)}</text>
      <text x="24" y="${canvasH - 62}" fill="#1f3556" font-size="13" font-family="DejaVu Sans, Arial, sans-serif">${sanitizeText(linhaDataHora)}</text>
      <text x="24" y="${canvasH - 40}" fill="#1f3556" font-size="12" font-family="DejaVu Sans, Arial, sans-serif">${sanitizeText(linhaEndereco)}</text>
      <text x="24" y="${canvasH - 18}" fill="#516b91" font-size="11" font-family="DejaVu Sans, Arial, sans-serif">${sanitizeText(`user_agent: ${agenteResumido}`)}</text>
    </svg>
  `;

  const compositeInputs: Array<{ input: Buffer; left: number; top: number }> = [
    { input: frenteBase, left: Math.floor((canvasW - frenteW) / 2), top: labelHeight }
  ];
  if (versoBase) {
    compositeInputs.push({
      input: versoBase,
      left: Math.floor((canvasW - versoW) / 2),
      top: versoSectionTop + labelHeight
    });
  }
  compositeInputs.push({ input: Buffer.from(overlaySvg), left: 0, top: 0 });

  const finalImage = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();

  const hash = createHash("sha256").update(finalImage).digest("hex");
  const timestampFile = formatTimestampForFile(now);
  const prefix = normalizePrefix(env.DOCUMENTOS_PREFIX || "documento");
  const objectPath = `${prefix}/${input.type}_completo_${timestampFile}_${randomUUID()}.png`;

  await minioClient.putObject(env.BUCKET_DOCUMENTOS, objectPath, finalImage, finalImage.length, {
    "Content-Type": "image/png",
    "x-amz-meta-signatory-id": input.signatoryId,
    "x-amz-meta-document-id": input.documentId,
    "x-amz-meta-doc-type": input.type,
    "x-amz-meta-side": "combined",
    "x-amz-meta-has-verso": versoBase ? "true" : "false",
    "x-amz-meta-hash": hash,
    "x-amz-meta-ip": effectiveIp ?? "",
    "x-amz-meta-latitude": String(effectiveLatitude ?? ""),
    "x-amz-meta-longitude": String(effectiveLongitude ?? ""),
    "x-amz-meta-identification-footer": "true",
    "x-amz-meta-user-agent": input.userAgent ?? "",
    "x-amz-meta-captured-at": capturedAtBrasilia,
    "x-amz-meta-captured-at-utc": capturedAtUtc
  });

  const { rows } = await db.query(
    `INSERT INTO documentos_signatario (document_id, signatory_id, doc_type, side, file_path, file_hash, ip, user_agent, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      input.documentId,
      input.signatoryId,
      input.type,
      "single",
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
      "document.uploaded",
      input.documentId,
      input.signatoryId,
      effectiveIp ?? null,
      input.userAgent ?? null,
      hash,
      JSON.stringify({
        source: "ms-documento",
        combined: true,
        hasVerso: !!versoBase,
        paths: {
          principal: objectPath,
          frente: null,
          verso: null
        },
        address: resolvedAddress ?? null,
        capturedAtBrasilia,
        capturedAtUtc
      })
    ]
  );

  return {
    id: rows[0].id,
    path: objectPath,
    paths: {
      principal: objectPath,
      frente: null,
      verso: null
    },
    type: input.type,
    hasVerso: !!versoBase,
    hash,
    documentId: input.documentId,
    signatoryId: input.signatoryId,
    ip: effectiveIp ?? null,
    latitude: effectiveLatitude ?? null,
    longitude: effectiveLongitude ?? null,
    address: resolvedAddress ?? null,
    capturedAt: capturedAtBrasilia,
    capturedAtUtc: capturedAtUtc,
    userAgent: input.userAgent ?? null,
    validation: { frente: validationFrente, verso: validationVerso }
  };
}
