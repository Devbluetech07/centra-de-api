package http

import (
	"context"
	"net/http"
	"time"

	"backend-go/database"
	"backend-go/handlers"
	"backend-go/internal/interfaces/http/manipulador"
	mw "backend-go/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
)

// NovoRoteador monta rotas HTTP preservando contratos atuais.
func NovoRoteador(origens string, producao bool) *gin.Engine {
	app := gin.New()
	app.Use(mw.Recuperacao())
	app.Use(mw.Logger())
	app.Use(mw.CORS(origens))
	app.Use(mw.Limitador())
	app.Use(mw.Seguranca(producao))

	saude := manipulador.NovoSaudeManipulador()
	capturas := manipulador.NovoCapturasManipulador()
	chaves := manipulador.NovoChavesAPIManipulador()
	usuarios := manipulador.NovoUsuariosManipulador()

	app.GET("/health", saude.Health)
	app.GET("/health/embeddings", func(c *gin.Context) {
		ctx := context.Background()
		var pending int
		var failed int
		_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM embedding_jobs WHERE status='pending'").Scan(&pending)
		_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM embedding_jobs WHERE status='failed'").Scan(&failed)
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"pending": pending,
			"failed":  failed,
			"ts":      time.Now().Format(time.RFC3339),
		})
	})

	api := app.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", usuarios.Registrar)
			auth.POST("/login", usuarios.Login)
			auth.GET("/me", mw.Autenticacao(), usuarios.Perfil)
		}
		keys := api.Group("/keys")
		keys.Use(mw.Autenticacao())
		{
			keys.GET("/", chaves.Listar)
			keys.POST("/", chaves.Criar)
			keys.PATCH("/:id", chaves.Atualizar)
			keys.DELETE("/:id", chaves.Deletar)
		}
		captures := api.Group("/captures")
		captures.Use(mw.Autenticacao())
		{
			captures.POST("/", capturas.Criar)
			captures.GET("/", capturas.Listar)
			captures.GET("/:id", capturas.Obter)
			captures.POST("/search", capturas.Buscar)
		}
		api.POST("/chat", mw.Autenticacao(), handlers.Chat)
		api.POST("/embeddings/process", mw.Autenticacao(), handlers.ProcessEmbedding)
	}

	app.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"message": "rota não encontrada"})
	})
	return app
}
