package middleware

import (
	mwLegado "backend-go/middleware"

	"github.com/gin-gonic/gin"
)

// Autenticacao aplica autenticação baseada em token.
func Autenticacao() gin.HandlerFunc {
	return mwLegado.RequireAuth()
}
