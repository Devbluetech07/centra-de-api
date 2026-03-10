package main

import (
	"log"

	"backend-go/handlers"
)

// main inicializa o worker assíncrono de embeddings.
func main() {
	log.Println("iniciando worker de embeddings")
	handlers.StartEmbeddingWorker()
	select {}
}
