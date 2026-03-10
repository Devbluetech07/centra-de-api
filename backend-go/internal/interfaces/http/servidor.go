package http

import (
	"log"

	"backend-go/database"
	"backend-go/internal/configuracao"
	"backend-go/internal/infraestrutura/banco"
	"backend-go/handlers"
	"backend-go/minio_client"
	"backend-go/security"
	"github.com/joho/godotenv"
)

// IniciarServidor sobe API HTTP com dependências principais.
func IniciarServidor() error {
	_ = godotenv.Load()
	cfg := configuracao.CarregarAmbiente()
	if err := configuracao.Validar(cfg); err != nil {
		return err
	}
	if err := security.ValidateSecrets(); err != nil {
		return err
	}
	if err := database.ConnectDB(); err != nil {
		return err
	}
	poolNovo, err := banco.NovaConexao(cfg)
	if err == nil {
		banco.DefinirPool(poolNovo)
		defer poolNovo.Close()
	} else {
		banco.DefinirPool(database.Pool)
	}
	defer database.Pool.Close()
	minio_client.InitMinio()

	ambienteProducao := cfg.Ambiente == "production"
	app := NovoRoteador(cfg.FrontendsPermit, ambienteProducao)
	handlers.StartEmbeddingWorker()
	log.Printf("servidor iniciado na porta %s", cfg.Porta)
	return app.Run("0.0.0.0:" + cfg.Porta)
}
