.PHONY: ajuda
ajuda: ## Mostra esta ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: instalar
instalar: ## Instala dependências
	go mod download
	go mod tidy

.PHONY: rodar
rodar: ## Roda a aplicação
	go run cmd/api/main.go

.PHONY: build
build: ## Compila a aplicação
	go build -o bin/api cmd/api/main.go

.PHONY: testar
testar: ## Executa todos os testes
	go test -v -race -coverprofile=cobertura.out ./...

.PHONY: cobertura
cobertura: testar ## Mostra cobertura de testes
	go tool cover -html=cobertura.out

.PHONY: lint
lint: ## Executa linter
	golangci-lint run ./...

.PHONY: formatar
formatar: ## Formata o código
	go fmt ./...

.PHONY: migrar
migrar: ## Executa migrations
	./scripts/migracao.sh up

.PHONY: seed
seed: ## Popula banco de dados
	./scripts/seed.sh

.PHONY: limpar
limpar: ## Limpa arquivos temporários
	rm -rf bin/
	rm -f cobertura.out
	go clean

.DEFAULT_GOAL := ajuda
