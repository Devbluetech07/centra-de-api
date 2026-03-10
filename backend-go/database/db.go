package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func ConnectDB() error {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "postgres"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "valeris"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "valeris"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "valerispass"
	}

	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, password, host, port, dbName)

	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return err
	}

	config.ConnConfig.ConnectTimeout = 5 * time.Second
	config.MaxConns = 20
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute

	Pool, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return err
	}

	err = Pool.Ping(context.Background())
	if err != nil {
		return err
	}
	if err := ensureTokenOnlySchema(); err != nil {
		return err
	}

	log.Printf("✅ Database connected (max=%d min=%d connect_timeout=%s max_lifetime=%s max_idle=%s health_check=%s)",
		config.MaxConns,
		config.MinConns,
		config.ConnConfig.ConnectTimeout,
		config.MaxConnLifetime,
		config.MaxConnIdleTime,
		config.HealthCheckPeriod,
	)
	return nil
}

func ensureTokenOnlySchema() error {
	statements := []string{
		`ALTER TABLE registros_captura ADD COLUMN IF NOT EXISTS token_hash TEXT`,
		`CREATE INDEX IF NOT EXISTS idx_registros_token_hash ON registros_captura(token_hash)`,
		`ALTER TABLE chaves_api ADD COLUMN IF NOT EXISTS owner_token_hash TEXT`,
		`CREATE INDEX IF NOT EXISTS idx_chaves_owner_token_hash ON chaves_api(owner_token_hash)`,
		`ALTER TABLE chaves_api ALTER COLUMN usuario_id DROP NOT NULL`,
		`ALTER TABLE chaves_api DROP CONSTRAINT IF EXISTS chaves_api_usuario_id_fkey`,
		`ALTER TABLE registros_captura DROP CONSTRAINT IF EXISTS registros_captura_usuario_id_fkey`,
		`ALTER TABLE ai_requests DROP CONSTRAINT IF EXISTS ai_requests_user_id_fkey`,
		`DROP TABLE IF EXISTS perfis`,
		`DROP TABLE IF EXISTS users`,
	}
	for _, stmt := range statements {
		if _, err := Pool.Exec(context.Background(), stmt); err != nil {
			return err
		}
	}
	return nil
}

// Simple in-memory cache for speed
var (
	cache   = make(map[string]interface{})
	cacheMu sync.RWMutex
)

func CacheSet(key string, value interface{}, duration time.Duration) {
	cacheMu.Lock()
	cache[key] = value
	cacheMu.Unlock()

	if duration > 0 {
		go func() {
			time.Sleep(duration)
			cacheMu.Lock()
			delete(cache, key)
			cacheMu.Unlock()
		}()
	}
}

func CacheGet(key string) (interface{}, bool) {
	cacheMu.RLock()
	defer cacheMu.RUnlock()
	val, ok := cache[key]
	return val, ok
}

// CacheDeletePrefix deletes all keys that start with the given prefix
func CacheDeletePrefix(prefix string) {
	cacheMu.Lock()
	defer cacheMu.Unlock()
	for k := range cache {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			delete(cache, k)
		}
	}
}
