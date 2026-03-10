package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net"
	"net/http"
	neturl "net/url"
	"os"
	"strings"
	"sync"
	"time"

	"backend-go/database"
	"backend-go/security"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func authenticateByJWT(tokenStr string, c *gin.Context) bool {
	secret, err := security.GetJWTSecret()
	if err != nil {
		log.Printf("jwt auth disabled by invalid secret config: %v", err)
		return false
	}

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return false
	}

	userID, ok := claims["userId"].(string)
	if !ok {
		return false
	}
	email, _ := claims["email"].(string)

	c.Set("userId", userID)
	c.Set("userEmail", email)
	return true
}

func authenticateByAPIKey(tokenStr string, c *gin.Context) bool {
	if !strings.HasPrefix(tokenStr, "vl_") {
		return false
	}

	hashBytes := sha256.Sum256([]byte(tokenStr))
	hash := hex.EncodeToString(hashBytes[:])

	ctx := context.Background()
	var userID string
	err := database.Pool.QueryRow(ctx,
		`SELECT usuario_id::text
		 FROM chaves_api
		 WHERE hash_chave = $1 AND ativo = TRUE`,
		hash,
	).Scan(&userID)
	if err != nil {
		return false
	}

	// Best effort telemetry for key usage.
	_, _ = database.Pool.Exec(ctx, "UPDATE chaves_api SET ultimo_uso = NOW() WHERE hash_chave = $1", hash)

	c.Set("userId", userID)
	c.Set("authTokenHash", hash)
	return true
}

func authenticateByIntegrationToken(tokenStr string, c *gin.Context) bool {
	raw := strings.TrimSpace(os.Getenv("INTEGRATION_TOKENS"))
	if raw == "" {
		return false
	}
	for _, item := range strings.Split(raw, ",") {
		t := strings.TrimSpace(item)
		if t != "" && tokenStr == t {
			c.Set("userId", nil)
			c.Set("userEmail", "integration-token@local")
			hashBytes := sha256.Sum256([]byte(tokenStr))
			c.Set("authTokenHash", hex.EncodeToString(hashBytes[:]))
			return true
		}
	}
	return false
}

func authenticateToken(tokenStr string, c *gin.Context) bool {
	isProduction := strings.EqualFold(strings.TrimSpace(os.Getenv("NODE_ENV")), "production")
	allowPortalDemo := os.Getenv("ALLOW_PORTAL_DEMO_TOKEN") == "true"
	if isProduction {
		allowPortalDemo = false
	}
	tokenOnlyMode := true
	portalToken := os.Getenv("PORTAL_DEMO_TOKEN")
	if portalToken == "" {
		portalToken = "portal-demo"
	}
	if tokenStr == portalToken {
		if isProduction {
			log.Printf("blocked demo token attempt in production: ip=%s path=%s", c.ClientIP(), c.Request.URL.Path)
			return false
		}
		if !allowPortalDemo {
			return false
		}
		if !isLocalRequest(c) {
			log.Printf("blocked demo token from non-local origin: ip=%s origin=%s host=%s", c.ClientIP(), c.GetHeader("Origin"), c.Request.Host)
			return false
		}
		if !allowDemoTokenByRate(c.ClientIP()) {
			log.Printf("demo token rate limit exceeded: ip=%s", c.ClientIP())
			return false
		}
		// Demo mode for local portal usage only.
		c.Set("userId", nil)
		c.Set("userEmail", "portal-demo@local")
		return true
	}
	if tokenOnlyMode {
		// Token-only mode: no JWT/session dependency.
		// A token remains valid until it is disabled/removed.
		return authenticateByIntegrationToken(tokenStr, c) || authenticateByAPIKey(tokenStr, c)
	}
	if authenticateByIntegrationToken(tokenStr, c) {
		return true
	}
	return authenticateByJWT(tokenStr, c) || authenticateByAPIKey(tokenStr, c)
}

type demoLimiterEntry struct {
	Count       int
	WindowStart time.Time
}

var (
	demoLimiterMu sync.Mutex
	demoLimiter   = map[string]demoLimiterEntry{}
)

func allowDemoTokenByRate(ip string) bool {
	const maxPerMinute = 20
	now := time.Now()

	demoLimiterMu.Lock()
	defer demoLimiterMu.Unlock()

	entry := demoLimiter[ip]
	if entry.WindowStart.IsZero() || now.Sub(entry.WindowStart) >= time.Minute {
		entry = demoLimiterEntry{Count: 1, WindowStart: now}
		demoLimiter[ip] = entry
		return true
	}
	if entry.Count >= maxPerMinute {
		return false
	}
	entry.Count++
	demoLimiter[ip] = entry
	return true
}

func isLocalRequest(c *gin.Context) bool {
	hosts := []string{
		c.Request.Host,
		c.GetHeader("Origin"),
		c.GetHeader("Referer"),
	}
	for _, raw := range hosts {
		if raw == "" {
			continue
		}
		host := extractHost(raw)
		if host == "localhost" || host == "127.0.0.1" || host == "::1" {
			return true
		}
	}
	ip := net.ParseIP(c.ClientIP())
	if ip != nil && ip.IsLoopback() {
		return true
	}
	return false
}

func extractHost(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	if strings.Contains(s, "://") {
		if u, err := neturl.Parse(s); err == nil {
			return u.Hostname()
		}
	}
	host, _, err := net.SplitHostPort(s)
	if err == nil {
		return host
	}
	return s
}

func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Token de autenticação necessário"})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if !authenticateToken(tokenStr, c) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Token inválido ou expirado"})
			return
		}
		c.Next()
	}
}

func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			if !authenticateToken(tokenStr, c) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Token inválido ou desativado"})
				return
			}
		}
		c.Next()
	}
}
