package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimitRule struct {
	Limit      int
	Window     time.Duration
	TokenBased bool
}

type rateLimitEntry struct {
	Count       int
	WindowStart time.Time
}

var (
	rateLimitMu      sync.Mutex
	rateLimitEntries = map[string]rateLimitEntry{}
)

func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		rule := pickRateLimitRule(c)
		key := rateLimitKey(c, rule)
		now := time.Now()

		rateLimitMu.Lock()
		entry := rateLimitEntries[key]
		if entry.WindowStart.IsZero() || now.Sub(entry.WindowStart) >= rule.Window {
			entry = rateLimitEntry{Count: 0, WindowStart: now}
		}

		remainingBefore := rule.Limit - entry.Count
		if remainingBefore < 0 {
			remainingBefore = 0
		}
		resetAt := entry.WindowStart.Add(rule.Window)
		c.Header("X-RateLimit-Limit", strconv.Itoa(rule.Limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remainingBefore))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetAt.Unix(), 10))

		if entry.Count >= rule.Limit {
			retryAfter := int(time.Until(resetAt).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			rateLimitMu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"message": "Rate limit excedido"})
			return
		}

		entry.Count++
		rateLimitEntries[key] = entry
		remainingAfter := rule.Limit - entry.Count
		if remainingAfter < 0 {
			remainingAfter = 0
		}
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remainingAfter))
		rateLimitMu.Unlock()

		c.Next()
	}
}

func pickRateLimitRule(c *gin.Context) rateLimitRule {
	path := c.FullPath()
	method := c.Request.Method

	switch {
	case path == "/api/auth/login" && method == http.MethodPost:
		return rateLimitRule{Limit: 5, Window: time.Minute}
	case path == "/api/auth/register" && method == http.MethodPost:
		return rateLimitRule{Limit: 3, Window: time.Hour}
	case path == "/api/captures/" && method == http.MethodPost:
		return rateLimitRule{Limit: 60, Window: time.Minute, TokenBased: true}
	default:
		return rateLimitRule{Limit: 100, Window: time.Minute}
	}
}

func rateLimitKey(c *gin.Context, rule rateLimitRule) string {
	if rule.TokenBased {
		auth := c.GetHeader("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			token := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
			if token != "" {
				return "token:" + token
			}
		}
	}
	return "ip:" + c.ClientIP()
}
