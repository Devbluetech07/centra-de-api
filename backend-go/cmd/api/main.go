package main

import (
	"log"

	"backend-go/internal/interfaces/http"
)

// main inicializa a API HTTP da aplicação.
func main() {
	if err := http.IniciarServidor(); err != nil {
		log.Fatalf("falha ao iniciar servidor API: %v", err)
	}
}
