package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/microsoft/go-mssqldb"
	"strconv"
	"strings"
)

var db *sql.DB

func initDB() {
	var err error
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		// Fallback for local testing or when DATABASE_URL is not set as a single string
		host := os.Getenv("DATABASE_HOST")
		user := os.Getenv("DATABASE_USER")
		password := os.Getenv("DATABASE_PASSWORD")
		dbName := os.Getenv("DATABASE_NAME")
		if host != "" && user != "" && password != "" && dbName != "" {
			connString = fmt.Sprintf("sqlserver://%s:%s@%s?database=%s", user, password, host, dbName)
		} else {
			log.Fatal("DATABASE_URL or proper individual DB env vars are required")
		}
	}

	db, err = sql.Open("sqlserver", connString)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}

	// Set connection pool settings from environment variables
	maxIdleConns := getEnvInt("DATABASE_MAX_IDLE_CONNS", 128)
	maxOpenConns := getEnvInt("DATABASE_MAX_OPEN_CONNS", 128)
	connMaxLifetime := getEnvInt("DATABASE_CONN_MAX_LIFETIME_MIN", 30)

	db.SetMaxIdleConns(maxIdleConns)
	db.SetMaxOpenConns(maxOpenConns)
	db.SetConnMaxLifetime(time.Duration(connMaxLifetime) * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("Error connecting to the database: %v", err)
	}

	log.Println("Connected to MSSQL database")
}

func getEnvInt(key string, defaultVal int) int {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func main() {
	// Set Gin to release mode for faster performance in benchmarks
	gin.SetMode(gin.ReleaseMode)

	initDB()
	defer db.Close()

	r := gin.New()
	// Using default recovery but not default logger for performance
	r.Use(gin.Recovery())

	// Endpoint: /plaintext
	r.GET("/plaintext", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello, World!")
	})

	// Endpoint: /json-serialization
	r.GET("/json-serialization", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Hello, World!"})
	})

	// Endpoint: /read-one
	type ReadOneQuery struct {
		ID int `form:"id" binding:"required"`
	}
	r.GET("/read-one", func(c *gin.Context) {
		var q ReadOneQuery
		if err := c.ShouldBindQuery(&q); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		var id, randomNumber int
		err := db.QueryRowContext(c.Request.Context(), "SELECT id, randomNumber FROM World WHERE id = @p1", q.ID).Scan(&id, &randomNumber)
		if err != nil {
			if err == sql.ErrNoRows {
				c.AbortWithStatus(http.StatusNotFound)
			} else {
				c.AbortWithStatus(http.StatusInternalServerError)
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"id": id, "randomNumber": randomNumber})
	})

	// Endpoint: /read-many
	type ReadManyQuery struct {
		Limit  int `form:"limit"`
		Offset int `form:"offset"`
	}
	r.GET("/read-many", func(c *gin.Context) {
		var q ReadManyQuery
		if err := c.ShouldBindQuery(&q); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		if q.Limit == 0 {
			q.Limit = 20
		}

		rows, err := db.QueryContext(c.Request.Context(), "SELECT id, randomNumber FROM World ORDER BY id OFFSET @p1 ROWS FETCH NEXT @p2 ROWS ONLY", q.Offset, q.Limit)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		worlds := []map[string]interface{}{}
		for rows.Next() {
			var id, randomNumber int
			if err := rows.Scan(&id, &randomNumber); err != nil {
				c.AbortWithStatus(http.StatusInternalServerError)
				return
			}
			worlds = append(worlds, map[string]interface{}{"id": id, "randomNumber": randomNumber})
		}

		c.JSON(http.StatusOK, worlds)
	})

	// Endpoint: /create-one
	type CreateOneBody struct {
		RandomNumber int `json:"randomNumber" binding:"required"`
	}
	r.POST("/create-one", func(c *gin.Context) {
		var b CreateOneBody
		if err := c.ShouldBindJSON(&b); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		_, err := db.ExecContext(c.Request.Context(), "INSERT INTO Temp (randomNumber) VALUES (@p1)", b.RandomNumber)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		c.Status(http.StatusCreated)
	})

	// Endpoint: /create-many
	type CreateManyItem struct {
		RandomNumber int `json:"randomNumber" binding:"required"`
	}
	type CreateManyBody struct {
		Items []CreateManyItem `json:"items" binding:"required,gt=0"`
	}
	r.POST("/create-many", func(c *gin.Context) {
		var b CreateManyBody
		if err := c.ShouldBindJSON(&b); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		tx, err := db.BeginTx(context.Background(), nil)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		defer tx.Rollback() // Rollback if not committed

		stmt, err := tx.Prepare("INSERT INTO Temp (randomNumber) VALUES (@p1)")
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		defer stmt.Close()

		for _, item := range b.Items {
			if _, err := stmt.Exec(item.RandomNumber); err != nil {
				c.AbortWithStatus(http.StatusInternalServerError)
				return
			}
		}

		if err := tx.Commit(); err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		c.Status(http.StatusCreated)
	})

	// Endpoint: /update-one/:id
	type UpdateOneBody struct {
		RandomNumber int `json:"randomNumber" binding:"required"`
	}
	type UpdateOneParams struct {
		ID int `uri:"id" binding:"required"`
	}
	r.PATCH("/update-one/:id", func(c *gin.Context) {
		var p UpdateOneParams
		if err := c.ShouldBindUri(&p); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		var b UpdateOneBody
		if err := c.ShouldBindJSON(&b); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		_, err := db.ExecContext(c.Request.Context(), "UPDATE World SET randomNumber = @p1 WHERE id = @p2", b.RandomNumber, p.ID)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		c.Status(http.StatusOK)
	})

	// Endpoint: /update-many
	type UpdateManyItem struct {
		ID           int `json:"id" binding:"required"`
		RandomNumber int `json:"randomNumber" binding:"required"`
	}
	type UpdateManyBody struct {
		Items []UpdateManyItem `json:"items" binding:"required,gt=0"`
	}
	r.PUT("/update-many", func(c *gin.Context) {
		var b UpdateManyBody
		if err := c.ShouldBindJSON(&b); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		if len(b.Items) == 0 {
			c.Status(http.StatusOK)
			return
		}

		query := "UPDATE World SET randomNumber = CASE id "
		args := make([]interface{}, 0, len(b.Items)*2)
		inClause := make([]string, 0, len(b.Items))

		for i, item := range b.Items {
			query += fmt.Sprintf("WHEN @p%d THEN @p%d ", i*2+1, i*2+2)
			args = append(args, item.ID, item.RandomNumber)
			inClause = append(inClause, fmt.Sprintf("@p%d", i*2+1))
		}
		query += "END WHERE id IN (" + strings.Join(inClause, ", ") + ")"

		_, err := db.ExecContext(c.Request.Context(), query, args...)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		c.Status(http.StatusOK)
	})

	// Endpoint: /delete-one/:id
	type DeleteOneParams struct {
		ID int `uri:"id" binding:"required"`
	}
	r.DELETE("/delete-one/:id", func(c *gin.Context) {
		var p DeleteOneParams
		if err := c.ShouldBindUri(&p); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		_, err := db.ExecContext(c.Request.Context(), "DELETE FROM Temp WHERE id = @p1", p.ID)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		c.Status(http.StatusNoContent)
	})

	// Endpoint: /delete-many
	type DeleteManyBody struct {
		IDs []int `json:"ids" binding:"required,gt=0"`
	}
	r.DELETE("/delete-many", func(c *gin.Context) {
		var b DeleteManyBody
		if err := c.ShouldBindJSON(&b); err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		tx, err := db.BeginTx(context.Background(), nil)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		stmt, err := tx.Prepare("DELETE FROM Temp WHERE id = @p1")
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		defer stmt.Close()

		for _, id := range b.IDs {
			if _, err := stmt.Exec(id); err != nil {
				c.AbortWithStatus(http.StatusInternalServerError)
				return
			}
		}

		if err := tx.Commit(); err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		c.Status(http.StatusNoContent)
	})

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "3000"
	}
	log.Printf("Starting server on port %s...\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
