package middleware

import (
	mwLegado "backend-go/middleware"

	"github.com/gin-gonic/gin"
)

// Limitador aplica rate limiting.
func Limitador() gin.HandlerFunc {
	return mwLegado.RateLimit()
}
