package resposta

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Sucesso envia resposta de sucesso.
func Sucesso(c *gin.Context, payload any) {
	c.JSON(http.StatusOK, payload)
}
