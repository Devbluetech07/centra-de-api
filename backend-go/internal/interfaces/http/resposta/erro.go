package resposta

import "github.com/gin-gonic/gin"

// Erro envia resposta de erro padronizada.
func Erro(c *gin.Context, status int, mensagem string) {
	c.JSON(status, gin.H{"message": mensagem})
}
