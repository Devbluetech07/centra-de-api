package main

import (
	"fmt"
	"log"
	"net"
	neturl "net/url"
	"strings"
)

func validateOrigins(originsRaw string, isProduction bool) ([]string, error) {
	origins := make([]string, 0)
	rejected := make([]string, 0)

	for _, item := range strings.Split(originsRaw, ",") {
		origin := strings.TrimSpace(item)
		if origin == "" {
			continue
		}

		ok, reason := validateSingleOrigin(origin, isProduction)
		if !ok {
			rejected = append(rejected, fmt.Sprintf("%s (%s)", origin, reason))
			continue
		}
		origins = append(origins, origin)
	}

	for _, r := range rejected {
		log.Printf("cors origin rejected: %s", r)
	}

	if isProduction {
		if strings.TrimSpace(originsRaw) == "" {
			return nil, fmt.Errorf("FRONTEND_URLS/FRONTEND_URL obrigatorio em producao")
		}
		if len(origins) == 0 {
			return nil, fmt.Errorf("nenhuma origem CORS valida em producao")
		}
	}

	if len(origins) == 0 {
		origins = []string{"http://localhost:3000", "http://localhost:3200"}
	}
	return origins, nil
}

func validateSingleOrigin(origin string, isProduction bool) (bool, string) {
	if strings.Contains(origin, "*") {
		if isProduction {
			return false, "wildcard nao permitido em producao"
		}
	}

	u, err := neturl.Parse(origin)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return false, "formato de URL invalido"
	}

	if isProduction && !strings.EqualFold(u.Scheme, "https") {
		return false, "apenas https permitido em producao"
	}

	host := u.Hostname()
	if host == "" {
		return false, "host invalido"
	}

	if isProduction {
		if host == "localhost" || host == "127.0.0.1" || host == "::1" {
			return false, "localhost nao permitido em producao"
		}
		if ip := net.ParseIP(host); ip != nil && ip.IsLoopback() {
			return false, "loopback nao permitido em producao"
		}
	}

	return true, ""
}
