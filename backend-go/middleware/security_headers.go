package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func SecurityHeaders(isProduction bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", buildCSP(c))

		if isProduction && isHTTPSRequest(c) {
			c.Header("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		}

		c.Next()
	}
}

func buildCSP(c *gin.Context) string {
	connectSrc := "connect-src 'self' https: wss:"
	if extra := strings.TrimSpace(c.GetHeader("X-CSP-Connect-Extra")); extra != "" {
		connectSrc = connectSrc + " " + extra
	}

	parts := []string{
		"default-src 'self'",
		"base-uri 'self'",
		"frame-ancestors 'none'",
		"object-src 'none'",
		"img-src 'self' data: blob: https:",
		"script-src 'self' 'unsafe-inline' https:",
		"style-src 'self' 'unsafe-inline' https:",
		"font-src 'self' data: https:",
		connectSrc,
	}

	return strings.Join(parts, "; ")
}

func isHTTPSRequest(c *gin.Context) bool {
	if c.Request.TLS != nil {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(c.GetHeader("X-Forwarded-Proto")), "https")
}
