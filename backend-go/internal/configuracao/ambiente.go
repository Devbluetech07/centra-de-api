package configuracao

import (
	"os"
	"strings"
)

// CarregarAmbiente cria a configuração com base nas variáveis de ambiente.
func CarregarAmbiente() Configuracao {
	return Configuracao{
		Ambiente:          obterOuPadrao("NODE_ENV", "development"),
		Porta:             obterOuPadrao("PORT", "3001"),
		HostBanco:         obterOuPadrao("DB_HOST", "postgres"),
		PortaBanco:        obterOuPadrao("DB_PORT", "5432"),
		NomeBanco:         obterOuPadrao("DB_NAME", "valeris"),
		UsuarioBanco:      obterOuPadrao("DB_USER", "valeris"),
		SenhaBanco:        obterOuPadrao("DB_PASSWORD", "valerispass"),
		SegredoJWT:        strings.TrimSpace(os.Getenv("JWT_SECRET")),
		FrontendsPermit:   obterOuPadrao("FRONTEND_URLS", os.Getenv("FRONTEND_URL")),
		EndpointMinio:     obterOuPadrao("MINIO_ENDPOINT", "minio:9000"),
		UsuarioMinio:      obterOuPadrao("MINIO_ROOT_USER", "minioadmin"),
		SenhaMinio:        obterOuPadrao("MINIO_ROOT_PASSWORD", "minioadmin"),
		UsarSSLMinio:      strings.EqualFold(os.Getenv("MINIO_USE_SSL"), "true"),
		TokensIntegracao:  strings.TrimSpace(os.Getenv("INTEGRATION_TOKENS")),
		PermitirTokenDemo: strings.EqualFold(os.Getenv("ALLOW_PORTAL_DEMO_TOKEN"), "true"),
		TokenDemo:         strings.TrimSpace(os.Getenv("PORTAL_DEMO_TOKEN")),
	}
}

func obterOuPadrao(chave, padrao string) string {
	valor := strings.TrimSpace(os.Getenv(chave))
	if valor == "" {
		return padrao
	}
	return valor
}
