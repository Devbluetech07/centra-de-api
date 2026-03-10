# valeris-backend

Backend em Go com organização baseada em Clean Architecture e Domain-Driven Design.

## Como rodar

```bash
make instalar
make rodar
```

## Estrutura principal

- `cmd`: pontos de entrada (`api`, `worker`, `cli`)
- `internal/dominio`: regras de negócio por domínio
- `internal/aplicacao`: casos de uso e DTOs
- `internal/infraestrutura`: banco, repositórios, cache e armazenamento
- `internal/interfaces/http`: roteamento e handlers HTTP
- `deployments`: artefatos para Docker e Kubernetes
