package main

import (
	"log"

	httpapp "backend-go/internal/interfaces/http"
)

func main() {
	if err := httpapp.IniciarServidor(); err != nil {
		log.Fatalf("erro ao iniciar aplicação: %v", err)
	}
}
