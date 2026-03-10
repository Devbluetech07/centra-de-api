package manipulador

import (
	"backend-go/handlers"

	"github.com/gin-gonic/gin"
)

// CapturasManipulador adapta rotas de captura para a nova camada HTTP.
type CapturasManipulador struct{}

func NovoCapturasManipulador() *CapturasManipulador {
	return &CapturasManipulador{}
}

func (h *CapturasManipulador) Criar(c *gin.Context)  { handlers.CreateCapture(c) }
func (h *CapturasManipulador) Listar(c *gin.Context) { handlers.GetCaptures(c) }
func (h *CapturasManipulador) Obter(c *gin.Context)  { handlers.GetCapture(c) }
func (h *CapturasManipulador) Buscar(c *gin.Context) { handlers.SearchCaptures(c) }
