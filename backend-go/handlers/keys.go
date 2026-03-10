package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"backend-go/database"
	"backend-go/models"

	"github.com/gin-gonic/gin"
)

func resolveKeyOwnerTokenHash(c *gin.Context) (string, bool) {
	if raw, exists := c.Get("authTokenHash"); exists && raw != nil {
		if tokenHash, ok := raw.(string); ok && strings.TrimSpace(tokenHash) != "" {
			return strings.TrimSpace(tokenHash), true
		}
	}
	return "", false
}

func GetKeys(c *gin.Context) {
	ctx := context.Background()
	ownerTokenHash, ok := resolveKeyOwnerTokenHash(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Token de autenticacao necessario"})
		return
	}

	rows, err := database.Pool.Query(ctx,
		`SELECT id, nome, prefixo_chave, perfil_escopo, ativo, criado_em, ultimo_uso
		 FROM chaves_api WHERE owner_token_hash=$1 ORDER BY criado_em DESC`, ownerTokenHash)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro interno"})
		return
	}
	defer rows.Close()

	keys := make([]models.APIKey, 0)
	for rows.Next() {
		var key models.APIKey
		err := rows.Scan(
			&key.ID, &key.Name, &key.KeyPrefix, &key.Scope,
			&key.IsActive, &key.CreatedAt, &key.LastUsedAt,
		)
		if err == nil {
			keys = append(keys, key)
		}
	}

	c.JSON(http.StatusOK, keys)
}

func CreateKey(c *gin.Context) {
	var body struct {
		Name  string `json:"name" binding:"required,min=1,max=100"`
		Scope string `json:"scope"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos"})
		return
	}
	ctx := context.Background()
	ownerTokenHash, ok := resolveKeyOwnerTokenHash(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Token de autenticacao necessario"})
		return
	}

	scope := strings.ToLower(strings.TrimSpace(body.Scope))
	switch scope {
	case "", "completo", "leitura", "escrita":
		if scope == "" {
			scope = "completo"
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"message": "Escopo inválido"})
		return
	}

	rawBytes := make([]byte, 32)
	rand.Read(rawBytes)
	rawKey := "vl_" + hex.EncodeToString(rawBytes)

	hashBytes := sha256.Sum256([]byte(rawKey))
	hash := hex.EncodeToString(hashBytes[:])

	prefix := rawKey[:12]

	var key models.APIKey
	err := database.Pool.QueryRow(ctx,
		`INSERT INTO chaves_api (usuario_id, owner_token_hash, nome, prefixo_chave, hash_chave, perfil_escopo)
		 VALUES (NULL,$1,$2,$3,$4,$5)
		 RETURNING id, nome, prefixo_chave, perfil_escopo, ativo, criado_em`,
		ownerTokenHash, body.Name, prefix, hash, scope,
	).Scan(&key.ID, &key.Name, &key.KeyPrefix, &key.Scope, &key.IsActive, &key.CreatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro interno"})
		return
	}

	key.Key = rawKey
	c.JSON(http.StatusCreated, gin.H{
		"id":          key.ID,
		"name":        key.Name,
		"key_prefix":  key.KeyPrefix,
		"scope":       key.Scope,
		"is_active":   key.IsActive,
		"created_at":  key.CreatedAt,
		"key":         key.Key,
		"warning":     "Guarde esta chave. Nao sera exibida novamente.",
		"invalidates": "Chaves antigas em plaintext devem ser rotacionadas imediatamente.",
	})
}

func UpdateKey(c *gin.Context) {
	keyId := c.Param("id")
	ctx := context.Background()
	ownerTokenHash, ok := resolveKeyOwnerTokenHash(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Token de autenticacao necessario"})
		return
	}

	var body struct {
		IsActive *bool `json:"is_active" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos"})
		return
	}

	var key models.APIKey
	err := database.Pool.QueryRow(ctx,
		`UPDATE chaves_api SET ativo=$1 WHERE id=$2 AND owner_token_hash=$3
		 RETURNING id, nome, prefixo_chave, ativo, criado_em`,
		*body.IsActive, keyId, ownerTokenHash,
	).Scan(&key.ID, &key.Name, &key.KeyPrefix, &key.IsActive, &key.CreatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Chave não encontrada"})
		return
	}

	c.JSON(http.StatusOK, key)
}

func DeleteKey(c *gin.Context) {
	keyId := c.Param("id")
	ctx := context.Background()
	ownerTokenHash, ok := resolveKeyOwnerTokenHash(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Token de autenticacao necessario"})
		return
	}

	_, err := database.Pool.Exec(ctx,
		"DELETE FROM chaves_api WHERE id=$1 AND owner_token_hash=$2",
		keyId, ownerTokenHash,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro interno"})
		return
	}

	c.Status(http.StatusNoContent)
}
