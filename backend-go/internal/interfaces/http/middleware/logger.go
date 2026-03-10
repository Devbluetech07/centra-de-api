package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger registra duração e status de requisições.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		inicio := time.Now()
		c.Next()
		log.Printf("%s %s %d %s", c.Request.Method, c.Request.URL.Path, c.Writer.Status(), time.Since(inicio))
	}
}
