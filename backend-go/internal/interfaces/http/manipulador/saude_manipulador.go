package manipulador

import (
	"context"
	"net/http"
	"time"

	"backend-go/internal/infraestrutura/banco"
	"github.com/gin-gonic/gin"
)

// SaudeManipulador expõe endpoints de healthcheck.
type SaudeManipulador struct{}

func NovoSaudeManipulador() *SaudeManipulador {
	return &SaudeManipulador{}
}

// Health retorna status da API e banco.
func (h *SaudeManipulador) Health(c *gin.Context) {
	if !banco.EstaSaudavel(context.Background()) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "db": "disconnected"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "db": "connected", "ts": time.Now().Format(time.RFC3339)})
}
