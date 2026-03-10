package manipulador

import (
	"backend-go/handlers"

	"github.com/gin-gonic/gin"
)

// UsuariosManipulador adapta autenticação de usuários legada.
type UsuariosManipulador struct{}

func NovoUsuariosManipulador() *UsuariosManipulador {
	return &UsuariosManipulador{}
}

func (h *UsuariosManipulador) Registrar(c *gin.Context) { handlers.Register(c) }
func (h *UsuariosManipulador) Login(c *gin.Context)     { handlers.Login(c) }
func (h *UsuariosManipulador) Perfil(c *gin.Context)    { handlers.Me(c) }
