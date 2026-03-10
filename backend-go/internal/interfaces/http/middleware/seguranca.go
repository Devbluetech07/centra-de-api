package middleware

import (
	mwLegado "backend-go/middleware"

	"github.com/gin-gonic/gin"
)

// Seguranca aplica cabeçalhos de segurança.
func Seguranca(producao bool) gin.HandlerFunc {
	return mwLegado.SecurityHeaders(producao)
}
