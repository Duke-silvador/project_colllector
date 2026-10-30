package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"my-pet/internal/cronjob"
	"my-pet/internal/db"
	"my-pet/internal/handler"
	"my-pet/internal/middleware"
)

//go:embed all:frontend/dist
var distFS embed.FS

func main() {
	port := getenv("PORT", "8080")
	jwtSecret := getenv("JWT_SECRET", "my-pet-secret-key-2026")
	if jwtSecret != "" {
		middleware.JWTSecret = []byte(jwtSecret)
	}
	dbPath := getenv("DB_PATH", "./data/my-pet.db")
	handler.SetDBPath(dbPath)

	g, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	h := &handler.Handler{DB: g}
	r := gin.Default()
	r.MaxMultipartMemory = 10 << 20
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: false,
	}))

	api := r.Group("/api")
	api.GET("/ping", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"message": "pong"}) })
	api.POST("/auth/login", h.Login)
	api.GET("/files/avatars/:name", h.ServeAvatar)

	auth := api.Group("", middleware.RequireAuth())
	{
		auth.GET("/auth/me", h.Me)
		auth.PUT("/auth/password", h.ChangePassword)

		auth.GET("/pets", h.ListPets)
		auth.GET("/pets/:id", h.GetPet)
		auth.POST("/pets/:id/feeds", h.CreateFeed)
		auth.GET("/pets/:id/feeds", h.ListFeeds)
		auth.POST("/pets/:id/reminders", h.CreateReminder)
		auth.GET("/pets/:id/reminders", h.ListReminders)
		auth.POST("/pets/:id/logs", h.CreateLog)
		auth.GET("/pets/:id/logs", h.ListLogs)
		auth.POST("/reminders/:id/complete", h.CompleteReminder)
	}

	admin := auth.Group("", middleware.RequireAdmin())
	{
		admin.POST("/pets", h.CreatePet)
		admin.PUT("/pets/:id", h.UpdatePet)
		admin.DELETE("/pets/:id", h.DeletePet)
		admin.POST("/pets/:id/avatar", h.UploadAvatar)
		admin.DELETE("/feeds/:id", h.DeleteFeed)
		admin.DELETE("/logs/:id", h.DeleteLog)
		admin.PUT("/reminders/:id", h.UpdateReminder)
		admin.DELETE("/reminders/:id", h.DeleteReminder)
		admin.POST("/users", h.CreateUser)
		admin.GET("/users", h.ListUsers)
		admin.DELETE("/users/:id", h.DeleteUser)
		admin.GET("/settings", h.GetSettings)
		admin.PUT("/settings", h.UpdateSettings)
		admin.GET("/settings/webhook", h.GetWebhook)
		admin.PUT("/settings/webhook", h.UpdateWebhook)
		admin.POST("/settings/webhook/test", h.TestWebhook)
		admin.GET("/settings/notifications", h.ListNotifications)
		admin.POST("/backup", h.Backup)
	}

	// 前端静态资源（SPA fallback）
	dist, err := fs.Sub(distFS, "frontend/dist")
	if err != nil {
		log.Fatalf("加载前端资源失败: %v", err)
	}
	fileServer := http.FileServer(http.FS(dist))
	r.NoRoute(func(c *gin.Context) {
		path := strings.TrimPrefix(c.Request.URL.Path, "/")
		if path != "" && strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "接口不存在"})
			return
		}
		if path != "" {
			if f, err := fs.Stat(dist, path); err == nil && !f.IsDir() {
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}
		data, err := fs.ReadFile(dist, "index.html")
		if err != nil {
			c.String(http.StatusNotFound, "前端资源未构建：请先执行 frontend 的 npm run build")
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	})

	cronjob.Start(g)

	log.Printf("我的宠物服务已启动: http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
