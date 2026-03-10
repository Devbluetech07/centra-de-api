package middleware

import "github.com/gin-gonic/gin"

// Autorizacao é middleware para RBAC futuro.
func Autorizacao() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}
