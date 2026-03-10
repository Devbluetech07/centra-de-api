package middleware

import "github.com/gin-gonic/gin"

// Recuperacao protege contra panics.
func Recuperacao() gin.HandlerFunc {
	return gin.Recovery()
}
