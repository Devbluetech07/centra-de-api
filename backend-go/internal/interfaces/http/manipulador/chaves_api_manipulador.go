package manipulador

import (
	"backend-go/handlers"

	"github.com/gin-gonic/gin"
)

// ChavesAPIManipulador adapta rotas de chaves para nova camada.
type ChavesAPIManipulador struct{}

func NovoChavesAPIManipulador() *ChavesAPIManipulador {
	return &ChavesAPIManipulador{}
}

func (h *ChavesAPIManipulador) Criar(c *gin.Context)      { handlers.CreateKey(c) }
func (h *ChavesAPIManipulador) Listar(c *gin.Context)     { handlers.GetKeys(c) }
func (h *ChavesAPIManipulador) Atualizar(c *gin.Context)  { handlers.UpdateKey(c) }
func (h *ChavesAPIManipulador) Deletar(c *gin.Context)    { handlers.DeleteKey(c) }
