package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"backend-go/database"
	"backend-go/minio_client"
	"backend-go/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/minio/minio-go/v7"
)

const (
	maxUploadDecodedBytes = 15 * 1024 * 1024
	minImageWidth         = 640
	minImageHeight        = 480
	maxImageWidth         = 4096
	maxImageHeight        = 4096
	minAspectRatio        = 0.4
	maxAspectRatio        = 2.5
	maxObjectMetaValueLen = 256
)

// CreateCapture - Cria um registro de captura e envia para o MinIO
func CreateCapture(c *gin.Context) {
	ctx := context.Background()
	var body struct {
		ServiceType string         `json:"service_type" binding:"required"`
		ImageData   string         `json:"image_data" binding:"required"`
		Metadata    map[string]any `json:"metadata"`
		Embedding   []float64      `json:"embedding"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos"})
		return
	}

	// Extrai userId legado se presente
	var dbUserId *uuid.UUID
	if val, ok := c.Get("userId"); ok && val != nil {
		if userIDStr, ok := val.(string); ok {
			u, err := uuid.Parse(userIDStr)
			if err == nil {
				dbUserId = &u
			}
		} else if u, ok := val.(uuid.UUID); ok {
			dbUserId = &u
		}
	}
	var ownerTokenHash *string
	if val, ok := c.Get("authTokenHash"); ok && val != nil {
		if tokenHash, ok := val.(string); ok && strings.TrimSpace(tokenHash) != "" {
			v := strings.TrimSpace(tokenHash)
			ownerTokenHash = &v
		}
	}

	validServices := map[string]bool{
		"assinatura": true, "documento": true, "selfie": true, "selfie-documento": true,
	}

	if !validServices[body.ServiceType] {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Tipo de serviço inválido"})
		return
	}

	if body.Metadata == nil {
		body.Metadata = make(map[string]any)
	}

	var latitude, longitude *float64
	var endereco *string
	var resultadoValidacao string = "{}"

	if lat, ok := body.Metadata["latitude"].(float64); ok {
		latitude = &lat
	}
	if lon, ok := body.Metadata["longitude"].(float64); ok {
		longitude = &lon
	}
	if end, ok := body.Metadata["endereco"].(string); ok {
		endereco = &end
	}
	if rr, ok := body.Metadata["resultado_validacao"]; ok {
		b, _ := json.Marshal(rr)
		resultadoValidacao = string(b)
	}
	metaBytes, _ := json.Marshal(body.Metadata)

	// Decode Base64 and Upload to MinIO
	b64data := body.ImageData
	if idx := strings.Index(b64data, ","); idx != -1 {
		b64data = b64data[idx+1:]
	}
	decodedImg, extension, contentType, errDecode := validateImage(b64data)
	if errDecode != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": errDecode.Error()})
		return
	}

	bucketName := "bluetech-sign"
	filename := fmt.Sprintf("%s_%s_%s.%s", body.ServiceType, time.Now().Format("20060102_150405_000"), uuid.New().String(), extension)
	objectPath := fmt.Sprintf("%s/%s", body.ServiceType, filename)

	userMeta := buildSafeObjectMetadata(body.Metadata)

	_, errMinio := minio_client.Client.PutObject(ctx, bucketName, objectPath, bytes.NewReader(decodedImg), int64(len(decodedImg)), minio.PutObjectOptions{
		ContentType:  contentType,
		UserMetadata: userMeta,
	})

	if errMinio != nil {
		log.Printf("❌ MinIO PutObject Error: %v", errMinio)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Falha ao salvar a imagem no storage: " + errMinio.Error()})
		return
	}

	// Backend Validation Logic (Simulated for high precision as requested)
	// In a real scenario, this would call an OCR/AI service
	validationStatus := "valid"
	if body.ServiceType == "documento" {
		// Mock logic: if 'error' is in metadata, fail it
		if _, fail := body.Metadata["simulate_error"]; fail {
			validationStatus = "invalid"
		}
	}

	var cap models.Capture
	var err error

	// Ensure metadata has validation result
	body.Metadata["validation_status"] = validationStatus
	metaBytes, _ = json.Marshal(body.Metadata)

	if len(body.Embedding) > 0 {
		var strVals []string
		for _, v := range body.Embedding {
			strVals = append(strVals, strconv.FormatFloat(v, 'f', -1, 64))
		}
		embStr := "[" + strings.Join(strVals, ",") + "]"

		err = database.Pool.QueryRow(ctx,
			`INSERT INTO registros_captura
			(usuario_id, token_hash, tipo_servico, status, image_data, latitude, longitude, endereco, resultado_validacao, metadados, embedding)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			RETURNING id, tipo_servico, status, image_data, metadados, criado_em`,
			dbUserId, ownerTokenHash, body.ServiceType, validationStatus, objectPath, latitude, longitude, endereco, resultadoValidacao, string(metaBytes), embStr,
		).Scan(&cap.ID, &cap.ServiceType, &cap.Status, &cap.ImageData, &cap.Metadata, &cap.CreatedAt)
	} else {
		err = database.Pool.QueryRow(ctx,
			`INSERT INTO registros_captura
			(usuario_id, token_hash, tipo_servico, status, image_data, latitude, longitude, endereco, resultado_validacao, metadados)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			RETURNING id, tipo_servico, status, image_data, metadados, criado_em`,
			dbUserId, ownerTokenHash, body.ServiceType, validationStatus, objectPath, latitude, longitude, endereco, resultadoValidacao, string(metaBytes),
		).Scan(&cap.ID, &cap.ServiceType, &cap.Status, &cap.ImageData, &cap.Metadata, &cap.CreatedAt)

		if err == nil {
			database.Pool.Exec(ctx, "INSERT INTO embedding_jobs (captura_id) VALUES ($1)", cap.ID)
		}
	}

	if err != nil {
		fmt.Println("DB Insert Error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao salvar no banco de dados"})
		return
	}

	// Invalidate cache for this user (all variants: by service_type, limit, offset, etc.)
	if ownerTokenHash != nil {
		prefix := fmt.Sprintf("captures_token_%s", *ownerTokenHash)
		database.CacheDeletePrefix(prefix)
		log.Printf("🧹 Cache invalidated for token hash prefix %s", prefix)
	} else if dbUserId != nil {
		prefix := fmt.Sprintf("captures_user_%v", dbUserId)
		database.CacheDeletePrefix(prefix)
		log.Printf("🧹 Cache invalidated for user %v with prefix %s", dbUserId, prefix)
	}

	c.JSON(http.StatusCreated, cap)
}

func GetCaptures(c *gin.Context) {
	userId, _ := c.Get("userId")
	tokenHash, _ := c.Get("authTokenHash")

	serviceType := c.Query("service_type")
	limitStr := c.Query("limit")
	offsetStr := c.Query("offset")

	// Check Cache
	cacheOwner := fmt.Sprintf("user_%v", userId)
	if tokenHash != nil {
		cacheOwner = fmt.Sprintf("token_%v", tokenHash)
	}
	cacheKey := fmt.Sprintf("captures_%s_%s_%s_%s", cacheOwner, serviceType, limitStr, offsetStr)
	if cached, ok := database.CacheGet(cacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	limit := 20
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	offset := 0
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	sql, args, err := buildGetCapturesQuery(userId, tokenHash, serviceType, limit, offset)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ctx := context.Background()
	rows, err := database.Pool.Query(ctx, sql, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro interno"})
		return
	}
	defer rows.Close()

	captures := make([]models.Capture, 0)
	for rows.Next() {
		var cap models.Capture
		if err := rows.Scan(&cap.ID, &cap.ServiceType, &cap.Status, &cap.ImageData, &cap.Metadata, &cap.CreatedAt); err == nil {
			captures = append(captures, cap)
		}
	}

	// Set Cache (5 minutes)
	database.CacheSet(cacheKey, captures, 5*time.Minute)

	c.JSON(http.StatusOK, captures)
}

func isValidCaptureServiceType(serviceType string) bool {
	validServices := map[string]bool{
		"assinatura": true, "documento": true, "selfie": true, "selfie-documento": true,
	}
	return validServices[serviceType]
}

func buildGetCapturesQuery(userID any, tokenHash any, serviceType string, limit int, offset int) (string, []any, error) {
	baseSelect := "SELECT id, tipo_servico, status, image_data, metadados, criado_em FROM registros_captura WHERE usuario_id = $1"
	baseArgs := []any{userID}
	if tokenHash != nil {
		baseSelect = "SELECT id, tipo_servico, status, image_data, metadados, criado_em FROM registros_captura WHERE token_hash = $1"
		baseArgs = []any{tokenHash}
	}
	withServiceType := baseSelect + " AND tipo_servico = $2 ORDER BY criado_em DESC LIMIT $3 OFFSET $4"
	withoutServiceType := baseSelect + " ORDER BY criado_em DESC LIMIT $2 OFFSET $3"

	if serviceType != "" && !isValidCaptureServiceType(serviceType) {
		return "", nil, errors.New("tipo de servico invalido")
	}
	if serviceType != "" {
		args := append(baseArgs, serviceType, limit, offset)
		return withServiceType, args, nil
	}
	args := append(baseArgs, limit, offset)
	return withoutServiceType, args, nil
}

func GetCapture(c *gin.Context) {
	userId, _ := c.Get("userId")
	tokenHash, hasTokenHash := c.Get("authTokenHash")
	id := c.Param("id")

	ctx := context.Background()
	var cap models.Capture
	var err error
	if hasTokenHash && tokenHash != nil {
		err = database.Pool.QueryRow(ctx,
			"SELECT id, tipo_servico, status, image_data, metadados, criado_em FROM registros_captura WHERE id=$1 AND token_hash=$2",
			id, tokenHash,
		).Scan(&cap.ID, &cap.ServiceType, &cap.Status, &cap.ImageData, &cap.Metadata, &cap.CreatedAt)
	} else {
		err = database.Pool.QueryRow(ctx,
			"SELECT id, tipo_servico, status, image_data, metadados, criado_em FROM registros_captura WHERE id=$1 AND usuario_id=$2",
			id, userId,
		).Scan(&cap.ID, &cap.ServiceType, &cap.Status, &cap.ImageData, &cap.Metadata, &cap.CreatedAt)
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Não encontrado"})
		return
	}

	c.JSON(http.StatusOK, cap)
}

func SearchCaptures(c *gin.Context) {
	userId, _ := c.Get("userId")
	tokenHash, hasTokenHash := c.Get("authTokenHash")

	var body struct {
		Embedding []float64 `json:"embedding" binding:"required"`
		Limit     int       `json:"limit"`
	}

	if err := c.ShouldBindJSON(&body); err != nil || len(body.Embedding) != 1536 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos"})
		return
	}

	if body.Limit <= 0 || body.Limit > 50 {
		body.Limit = 5
	}

	var strVals []string
	for _, v := range body.Embedding {
		strVals = append(strVals, strconv.FormatFloat(v, 'f', -1, 64))
	}
	embStr := "[" + strings.Join(strVals, ",") + "]"

	ctx := context.Background()
	var rows pgx.Rows
	var err error
	if hasTokenHash && tokenHash != nil {
		rows, err = database.Pool.Query(ctx,
			`SELECT id, tipo_servico, metadados, criado_em, 1 - (embedding <=> $1::vector) AS similarity
			 FROM registros_captura
			 WHERE token_hash=$2 AND embedding IS NOT NULL
			 ORDER BY embedding <=> $1::vector LIMIT $3`,
			embStr, tokenHash, body.Limit,
		)
	} else {
		rows, err = database.Pool.Query(ctx,
			`SELECT id, tipo_servico, metadados, criado_em, 1 - (embedding <=> $1::vector) AS similarity
			 FROM registros_captura
			 WHERE usuario_id=$2 AND embedding IS NOT NULL
			 ORDER BY embedding <=> $1::vector LIMIT $3`,
			embStr, userId, body.Limit,
		)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro interno"})
		return
	}
	defer rows.Close()

	results := make([]models.SearchCaptureResult, 0)
	for rows.Next() {
		var res models.SearchCaptureResult
		if err := rows.Scan(&res.ID, &res.ServiceType, &res.Metadata, &res.CreatedAt, &res.Similarity); err == nil {
			results = append(results, res)
		}
	}

	c.JSON(http.StatusOK, results)
}

func validateImage(b64data string) ([]byte, string, string, error) {
	if estimatedDecodedLength(b64data) > maxUploadDecodedBytes {
		return nil, "", "", errors.New("imagem excede limite de 15MB")
	}

	decodedImg, err := base64.StdEncoding.DecodeString(b64data)
	if err != nil {
		return nil, "", "", errors.New("falha ao decodificar a imagem")
	}
	if len(decodedImg) == 0 {
		return nil, "", "", errors.New("imagem vazia")
	}
	if len(decodedImg) > maxUploadDecodedBytes {
		return nil, "", "", errors.New("imagem excede limite de 15MB")
	}

	extension, contentType, ok := isValidImageType(decodedImg)
	if !ok {
		return nil, "", "", errors.New("formato de imagem invalido: use PNG ou JPEG")
	}

	cfg, _, err := image.DecodeConfig(bytes.NewReader(decodedImg))
	if err != nil {
		return nil, "", "", errors.New("nao foi possivel ler dimensoes da imagem")
	}

	if cfg.Width < minImageWidth || cfg.Height < minImageHeight {
		return nil, "", "", fmt.Errorf("dimensoes minimas: %dx%d", minImageWidth, minImageHeight)
	}
	if cfg.Width > maxImageWidth || cfg.Height > maxImageHeight {
		return nil, "", "", fmt.Errorf("dimensoes maximas: %dx%d", maxImageWidth, maxImageHeight)
	}

	aspect := float64(cfg.Width) / float64(cfg.Height)
	if aspect < minAspectRatio || aspect > maxAspectRatio {
		return nil, "", "", errors.New("aspect ratio invalido")
	}

	return decodedImg, extension, contentType, nil
}

func estimatedDecodedLength(b64 string) int {
	padding := 0
	if strings.HasSuffix(b64, "==") {
		padding = 2
	} else if strings.HasSuffix(b64, "=") {
		padding = 1
	}
	return (len(b64)*3)/4 - padding
}

func isValidImageType(data []byte) (string, string, bool) {
	if len(data) >= 8 &&
		data[0] == 0x89 &&
		data[1] == 0x50 &&
		data[2] == 0x4E &&
		data[3] == 0x47 &&
		data[4] == 0x0D &&
		data[5] == 0x0A &&
		data[6] == 0x1A &&
		data[7] == 0x0A {
		return "png", "image/png", true
	}
	if len(data) >= 3 &&
		data[0] == 0xFF &&
		data[1] == 0xD8 &&
		data[2] == 0xFF {
		return "jpg", "image/jpeg", true
	}
	return "", "", false
}

var objectMetaKeySanitizer = regexp.MustCompile(`[^a-z0-9_-]`)

func buildSafeObjectMetadata(metadata map[string]any) map[string]string {
	if len(metadata) == 0 {
		return map[string]string{}
	}

	allowedKeys := map[string]struct{}{
		"latitude":    {},
		"longitude":   {},
		"endereco":    {},
		"serviceType": {},
		"confidence":  {},
	}

	result := make(map[string]string, len(allowedKeys))
	for key := range allowedKeys {
		raw, ok := metadata[key]
		if !ok || raw == nil {
			continue
		}

		sanitizedKey := sanitizeObjectMetadataKey(key)
		if sanitizedKey == "" {
			continue
		}

		value := strings.TrimSpace(fmt.Sprintf("%v", raw))
		if value == "" {
			continue
		}
		if len(value) > maxObjectMetaValueLen {
			value = value[:maxObjectMetaValueLen]
		}
		result[sanitizedKey] = value
	}

	return result
}

func sanitizeObjectMetadataKey(key string) string {
	k := strings.ToLower(strings.TrimSpace(key))
	k = objectMetaKeySanitizer.ReplaceAllString(k, "_")
	k = strings.Trim(k, "_")
	if k == "" {
		return ""
	}
	return k
}
