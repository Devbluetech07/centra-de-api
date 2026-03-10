package middleware

import (
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS cria middleware CORS com origens configuráveis.
func CORS(origens string) gin.HandlerFunc {
	lista := []string{"http://localhost:3200", "http://127.0.0.1:3200"}
	if strings.TrimSpace(origens) != "" {
		lista = []string{}
		for _, item := range strings.Split(origens, ",") {
			valor := strings.TrimSpace(item)
			if valor != "" {
				lista = append(lista, valor)
			}
		}
	}
	return cors.New(cors.Config{
		AllowOrigins:     lista,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}
